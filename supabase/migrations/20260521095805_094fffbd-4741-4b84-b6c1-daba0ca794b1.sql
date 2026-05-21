
DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('draft','sent','partial','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  _num text;
BEGIN
  _num := 'FAC-' || to_char(now(),'YYYYMM') || '-' || LPAD(FLOOR(random()*10000)::text, 4, '0');
  RETURN _num;
END;
$fn$;

CREATE TABLE IF NOT EXISTS public.wholesale_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT public.generate_invoice_number(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  description text,
  amount_ht numeric(14,2) NOT NULL,
  tva_rate numeric(5,2) NOT NULL DEFAULT 19.25,
  amount_tva numeric(14,2) NOT NULL DEFAULT 0,
  amount_ttc numeric(14,2) NOT NULL,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  payment_terms text NOT NULL DEFAULT 'prepaid',
  due_date date,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status public.invoice_status NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_invoices_user ON public.wholesale_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_invoices_status ON public.wholesale_invoices(status);

ALTER TABLE public.wholesale_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own invoices" ON public.wholesale_invoices
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage invoices" ON public.wholesale_invoices
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_wholesale_invoices_updated
  BEFORE UPDATE ON public.wholesale_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wholesale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.wholesale_invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'mobile_money',
  reference text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_payments_invoice ON public.wholesale_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_payments_user ON public.wholesale_payments(user_id);

ALTER TABLE public.wholesale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers view own payments" ON public.wholesale_payments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payments" ON public.wholesale_payments
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Outstanding balance
CREATE OR REPLACE FUNCTION public.get_wholesaler_outstanding(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(SUM(amount_ttc - amount_paid), 0)
  FROM public.wholesale_invoices
  WHERE user_id = _user_id
    AND status IN ('sent','partial','overdue');
$fn$;

-- Convert approved quote to invoice
CREATE OR REPLACE FUNCTION public.create_invoice_from_quote(_quote_id uuid, _due_days int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _q record;
  _ttc numeric;
  _tva numeric;
  _ht numeric;
  _invoice_id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT * INTO _q FROM public.quote_requests WHERE id = _quote_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote not found');
  END IF;
  IF _q.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quote has no linked user');
  END IF;

  -- If NIU provided → considered HT pricing, add TVA. Otherwise TTC includes tax already.
  IF _q.niu IS NOT NULL AND length(trim(_q.niu)) > 0 THEN
    _ht := _q.total_price;
    _tva := round(_ht * 0.1925, 2);
    _ttc := _ht + _tva;
  ELSE
    _ttc := _q.total_price;
    _ht := round(_ttc / 1.1925, 2);
    _tva := _ttc - _ht;
  END IF;

  INSERT INTO public.wholesale_invoices (
    user_id, quote_id, description, amount_ht, amount_tva, amount_ttc,
    payment_terms, due_date, status, created_by
  )
  VALUES (
    _q.user_id, _quote_id,
    format('%s × %s (%s)', _q.quantity, _q.product_name, _q.packaging_type),
    _ht, _tva, _ttc,
    CASE WHEN _due_days = 0 THEN 'prepaid' ELSE 'net_'||_due_days END,
    CASE WHEN _due_days = 0 THEN NULL ELSE (current_date + _due_days)::date END,
    'sent', auth.uid()
  )
  RETURNING id INTO _invoice_id;

  UPDATE public.quote_requests
  SET status = 'traite', processed_at = now(), processed_by = auth.uid()
  WHERE id = _quote_id;

  RETURN jsonb_build_object('success', true, 'invoice_id', _invoice_id);
END;
$fn$;

-- Register payment
CREATE OR REPLACE FUNCTION public.register_invoice_payment(
  _invoice_id uuid,
  _amount numeric,
  _method text DEFAULT 'mobile_money',
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _inv record;
  _new_paid numeric;
  _new_status public.invoice_status;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  SELECT * INTO _inv FROM public.wholesale_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  _new_paid := COALESCE(_inv.amount_paid,0) + _amount;
  IF _new_paid >= _inv.amount_ttc THEN
    _new_status := 'paid';
    _new_paid := _inv.amount_ttc;
  ELSE
    _new_status := 'partial';
  END IF;

  INSERT INTO public.wholesale_payments (invoice_id, user_id, amount, payment_method, reference, notes, recorded_by)
  VALUES (_invoice_id, _inv.user_id, _amount, _method, _reference, _notes, auth.uid());

  UPDATE public.wholesale_invoices
  SET amount_paid = _new_paid, status = _new_status, updated_at = now()
  WHERE id = _invoice_id;

  IF _new_status = 'paid' THEN
    UPDATE public.wholesaler_profiles
    SET total_orders = total_orders + 1,
        total_spent = total_spent + _inv.amount_ttc,
        updated_at = now()
    WHERE user_id = _inv.user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', _new_status, 'amount_paid', _new_paid);
END;
$fn$;
