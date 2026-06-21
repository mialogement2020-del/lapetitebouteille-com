import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Receipt, FileText, Loader2, Plus, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminInvoices, type WholesaleInvoice, type InvoiceStatus } from "@/hooks/useWholesaleInvoices";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";

const STATUS: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "border-cream/20 text-cream/60" },
  sent: { label: "À régler", color: "border-yellow-500/40 text-yellow-400" },
  partial: { label: "Partiel", color: "border-orange-500/40 text-orange-400" },
  paid: { label: "Payée", color: "border-green-500/40 text-green-400" },
  overdue: { label: "En retard", color: "border-red-500/40 text-red-400" },
  cancelled: { label: "Annulée", color: "border-cream/20 text-cream/40" },
};

export const WholesaleInvoicesManager = () => {
  const { data: invoices = [], isLoading, createFromQuote, registerPayment } = useAdminInvoices();
  const [convertOpen, setConvertOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<WholesaleInvoice | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-display text-cream flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Facturation B2B
          </h2>
          <p className="text-cream/60 text-sm">{invoices.length} facture(s) émise(s)</p>
        </div>
        <Button className="bg-gradient-gold text-noir" onClick={() => setConvertOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Convertir un devis
        </Button>
      </div>

      <Card className="bg-noir/50 border-gold/20">
        <CardContent className="p-4 space-y-2">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          ) : invoices.length === 0 ? (
            <p className="text-cream/60 text-sm py-8 text-center">Aucune facture pour l'instant.</p>
          ) : (
            invoices.map((inv) => {
              const remaining = Number(inv.amount_ttc) - Number(inv.amount_paid);
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-noir/30 border border-gold/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-cream font-medium truncate">{inv.invoice_number}</p>
                    <p className="text-xs text-cream/50 truncate">{inv.description}</p>
                    <p className="text-xs text-cream/40">
                      {new Date(inv.issued_at).toLocaleDateString("fr-FR")} · {inv.payment_terms}
                      {inv.due_date && <> · échéance {new Date(inv.due_date).toLocaleDateString("fr-FR")}</>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-cream font-display">{formatPrice(inv.amount_ttc)} FCFA</p>
                    {remaining > 0 && inv.status !== "cancelled" && (
                      <p className="text-xs text-yellow-400">Reste {formatPrice(remaining)} FCFA</p>
                    )}
                  </div>
                  <Badge variant="outline" className={STATUS[inv.status].color}>{STATUS[inv.status].label}</Badge>
                  {remaining > 0 && inv.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="border-gold/30 text-cream" onClick={() => setPayOpen(inv)}>
                      <Wallet className="h-4 w-4 mr-1" /> Encaisser
                    </Button>
                  )}
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>

      <ConvertQuoteDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConvert={(quoteId, dueDays) => createFromQuote.mutateAsync({ quoteId, dueDays })}
        loading={createFromQuote.isPending}
      />

      <RegisterPaymentDialog
        invoice={payOpen}
        onOpenChange={(o) => !o && setPayOpen(null)}
        onPay={(p) => registerPayment.mutateAsync(p)}
        loading={registerPayment.isPending}
      />
    </div>
  );
};

const ConvertQuoteDialog = ({
  open,
  onOpenChange,
  onConvert,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConvert: (quoteId: string, dueDays: number) => Promise<any>;
  loading: boolean;
}) => {
  const { data: quotes = [] } = useQuery({
    queryKey: ["admin-convertible-quotes"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, product_name, packaging_type, quantity, total_price, client_name, niu, status, user_id, created_at")
        .not("user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [quoteId, setQuoteId] = useState("");
  const [dueDays, setDueDays] = useState("0");

  const submit = async () => {
    if (!quoteId) return toast({ title: "Sélectionnez un devis", variant: "destructive" });
    try {
      await onConvert(quoteId, Number(dueDays) || 0);
      toast({ title: "Facture créée ✅" });
      onOpenChange(false);
      setQuoteId("");
      setDueDays("0");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/20 text-cream">
        <DialogHeader>
          <DialogTitle>Convertir un devis en facture</DialogTitle>
          <DialogDescription className="text-cream/60">
            La TVA 19,25 % est ajoutée automatiquement si le devis comporte un NIU.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-cream/80 text-sm">Devis</Label>
            <Select value={quoteId} onValueChange={setQuoteId}>
              <SelectTrigger className="bg-noir/50 border-gold/20"><SelectValue placeholder="Sélectionnez…" /></SelectTrigger>
              <SelectContent>
                {quotes.map((q: any) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.client_name} · {q.product_name} × {q.quantity} · {formatPrice(q.total_price)} FCFA
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-cream/80 text-sm">Conditions de paiement</Label>
            <Select value={dueDays} onValueChange={setDueDays}>
              <SelectTrigger className="bg-noir/50 border-gold/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Paiement comptant</SelectItem>
                <SelectItem value="15">Net 15 jours</SelectItem>
                <SelectItem value="30">Net 30 jours</SelectItem>
                <SelectItem value="45">Net 45 jours</SelectItem>
                <SelectItem value="60">Net 60 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-gradient-gold text-noir" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RegisterPaymentDialog = ({
  invoice,
  onOpenChange,
  onPay,
  loading,
}: {
  invoice: WholesaleInvoice | null;
  onOpenChange: (o: boolean) => void;
  onPay: (p: { invoiceId: string; amount: number; method: string; reference?: string }) => Promise<any>;
  loading: boolean;
}) => {
  const remaining = invoice ? Number(invoice.amount_ttc) - Number(invoice.amount_paid) : 0;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [reference, setReference] = useState("");

  const reset = () => {
    setAmount("");
    setReference("");
    setMethod("mobile_money");
  };

  const submit = async () => {
    if (!invoice) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast({ title: "Montant invalide", variant: "destructive" });
    try {
      await onPay({ invoiceId: invoice.id, amount: amt, method, reference: reference || undefined });
      toast({ title: "Encaissement enregistré ✅" });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/20 text-cream">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          {invoice && (
            <DialogDescription className="text-cream/60">
              {invoice.invoice_number} · Reste à payer {formatPrice(remaining)} FCFA
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-cream/80 text-sm">Montant encaissé (FCFA)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-noir/50 border-gold/20"
              placeholder={String(remaining)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-cream/80 text-sm">Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="bg-noir/50 border-gold/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-cream/80 text-sm">Référence (optionnel)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} className="bg-noir/50 border-gold/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button className="bg-gradient-gold text-noir" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};