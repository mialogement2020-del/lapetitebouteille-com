import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownRight, Smartphone, CreditCard, Gift, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { WalletTransaction, AmbassadorStats } from "@/hooks/useAmbassador";
import { z } from "zod";
import { useTranslation } from "react-i18next";

interface WalletManagerProps {
  stats: AmbassadorStats;
  transactions: WalletTransaction[];
  isLoading: boolean;
  refetchStats: () => void;
}

const withdrawalSchema = z.object({
  amount: z.number().min(5000, "Minimum 5 000 FCFA").max(500000, "Maximum 500 000 FCFA"),
  phone: z.string().min(9, "Numéro invalide").max(15),
  method: z.enum(["mtn_money", "orange_money"]),
});

const TRANSACTION_ICONS: Record<string, typeof ArrowUpRight> = {
  commission: ArrowDownRight,
  bonus: Gift,
  withdrawal: ArrowUpRight,
  store_credit: CreditCard,
  adjustment: AlertCircle,
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function WalletManager({ stats, transactions, isLoading, refetchStats }: WalletManagerProps) {
  const { t, i18n } = useTranslation("walletManager");
  const dateFnsLocale = i18n.language === "en" ? enUS : fr;
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"mtn_money" | "orange_money">("mtn_money");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-CM", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " FCFA";
  };

  const handleWithdraw = async () => {
    setErrors({});
    const result = withdrawalSchema.safeParse({ amount: Number(withdrawAmount), phone: withdrawPhone, method: withdrawMethod });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    if (Number(withdrawAmount) > stats.availableBalance) {
      setErrors({ amount: t("error.insufficientFunds") });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_withdrawal" as never, {
        _amount: Number(withdrawAmount),
        _phone_number: withdrawPhone,
        _payment_method: withdrawMethod,
      } as never);
      if (error) throw error;
      toast({ title: t("toast.withdrawSuccess"), description: t("toast.withdrawSuccessDesc", { amount: formatCurrency(Number(withdrawAmount)) }) });
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawPhone("");
      refetchStats();
    } catch (error: unknown) {
      toast({ title: t("toast.error"), description: getErrorMessage(error, t("toast.errorDesc")), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-xl bg-noir-light/50 animate-pulse" />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-noir-light/50 animate-pulse" />)}</div>
      </div>
    );
  }

  const TRANSACTION_LABELS: Record<string, string> = {
    commission: t("type.commission"),
    bonus: t("type.bonus"),
    withdrawal: t("type.withdrawal"),
    store_credit: t("type.store_credit"),
    adjustment: t("type.adjustment"),
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-gold/20 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-cream/60 text-sm">{t("availableBalance")}</p>
              <h3 className="font-display text-3xl text-cream">{formatCurrency(stats.availableBalance)}</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-gold text-noir font-semibold" disabled={stats.availableBalance < 5000}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {t("btnWithdraw")}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-noir border-gold/20">
                <DialogHeader>
                  <DialogTitle className="text-cream font-display">{t("dialogTitle")}</DialogTitle>
                  <DialogDescription className="text-cream/60">{t("dialogDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-cream/80">{t("amount")}</Label>
                    <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="10000" className="bg-cream/5 border-gold/20 text-cream" />
                    {errors.amount && <p className="text-destructive text-sm">{errors.amount}</p>}
                    <p className="text-cream/50 text-xs">{t("available", { amount: formatCurrency(stats.availableBalance) })}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-cream/80">{t("paymentMethod")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setWithdrawMethod("mtn_money")} className={`p-3 rounded-lg border flex items-center gap-2 transition-all ${withdrawMethod === "mtn_money" ? "border-yellow-500 bg-yellow-500/10" : "border-gold/20 bg-cream/5"}`}>
                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center"><Smartphone className="h-4 w-4 text-white" /></div>
                        <span className="text-cream text-sm">MTN MoMo</span>
                      </button>
                      <button type="button" onClick={() => setWithdrawMethod("orange_money")} className={`p-3 rounded-lg border flex items-center gap-2 transition-all ${withdrawMethod === "orange_money" ? "border-orange-500 bg-orange-500/10" : "border-gold/20 bg-cream/5"}`}>
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center"><Smartphone className="h-4 w-4 text-white" /></div>
                        <span className="text-cream text-sm">Orange Money</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-cream/80">{t("phone")}</Label>
                    <Input type="tel" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} placeholder="6 XX XX XX XX" className="bg-cream/5 border-gold/20 text-cream" />
                    {errors.phone && <p className="text-destructive text-sm">{errors.phone}</p>}
                  </div>
                  <Button onClick={handleWithdraw} disabled={isSubmitting} className="w-full bg-gradient-gold text-noir font-semibold">
                    {isSubmitting ? t("btnSubmitting") : t("btnSubmit")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="border-gold/30 text-cream hover:bg-cream/10">
              <Gift className="h-4 w-4 mr-2" />
              {t("btnStoreCredit")}
            </Button>
          </div>
        </div>
      </motion.div>

      <div>
        <h4 className="text-cream font-medium mb-4">{t("transactionsTitle")}</h4>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-cream/50">{t("noTransactions")}</div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, index) => {
              const Icon = TRANSACTION_ICONS[tx.type] || ArrowDownRight;
              const isCredit = tx.amount > 0;
              return (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="flex items-center gap-3 p-3 rounded-lg bg-noir-light/20 border border-gold/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? "bg-green-500/20" : "bg-red-500/20"}`}>
                    <Icon className={`h-4 w-4 ${isCredit ? "text-green-400" : "text-red-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm">{TRANSACTION_LABELS[tx.type] || tx.type}</p>
                    <p className="text-cream/50 text-xs truncate">{tx.description || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${isCredit ? "text-green-400" : "text-red-400"}`}>{isCredit ? "+" : ""}{formatCurrency(tx.amount)}</p>
                    <p className="text-cream/40 text-xs">{format(new Date(tx.created_at), "d MMM", { locale: dateFnsLocale })}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
