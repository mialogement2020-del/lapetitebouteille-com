import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";

export interface WholesaleInvoice {
  id: string;
  invoice_number: string;
  user_id: string;
  quote_id: string | null;
  description: string | null;
  amount_ht: number;
  tva_rate: number;
  amount_tva: number;
  amount_ttc: number;
  amount_paid: number;
  payment_terms: string;
  due_date: string | null;
  issued_at: string;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
}

export interface WholesalePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
}

export const useMyInvoices = () => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["my-invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_invoices")
        .select("*")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WholesaleInvoice[];
    },
  });
};

export const useMyOutstanding = () => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["my-outstanding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_wholesaler_outstanding", { _user_id: user!.id });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
};

// Admin
export const useAdminInvoices = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as WholesaleInvoice[];
    },
  });

  const createFromQuote = useMutation({
    mutationFn: async ({ quoteId, dueDays }: { quoteId: string; dueDays: number }) => {
      const { data, error } = await supabase.rpc("create_invoice_from_quote", {
        _quote_id: quoteId,
        _due_days: dueDays,
      });
      if (error) throw error;
      const r = data as { success: boolean; error?: string; invoice_id?: string };
      if (!r.success) throw new Error(r.error ?? "Échec création facture");
      return r.invoice_id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["my-invoices"] });
    },
  });

  const registerPayment = useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      method,
      reference,
    }: {
      invoiceId: string;
      amount: number;
      method?: string;
      reference?: string;
    }) => {
      const { data, error } = await supabase.rpc("register_invoice_payment", {
        _invoice_id: invoiceId,
        _amount: amount,
        _method: method ?? "mobile_money",
        _reference: reference ?? null,
      });
      if (error) throw error;
      const r = data as { success: boolean; error?: string };
      if (!r.success) throw new Error(r.error ?? "Échec encaissement");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      qc.invalidateQueries({ queryKey: ["my-invoices"] });
      qc.invalidateQueries({ queryKey: ["my-outstanding"] });
    },
  });

  return { ...query, createFromQuote, registerPayment };
};