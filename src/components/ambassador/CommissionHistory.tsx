import { motion } from "framer-motion";
import { ArrowDownRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { Commission } from "@/hooks/useAmbassador";
import { useTranslation } from "react-i18next";

interface CommissionHistoryProps {
  commissions: Commission[];
  isLoading: boolean;
}

export function CommissionHistory({ commissions, isLoading }: CommissionHistoryProps) {
  const { t, i18n } = useTranslation();
  const dateFnsLocale = i18n.language === "en" ? enUS : fr;

  const STATUS_CONFIG = {
    pending:  { label: t("commissionHistory.status.pending"),  icon: Clock,        className: "text-amber-400 bg-amber-500/10" },
    completed:{ label: t("commissionHistory.status.completed"),icon: CheckCircle2, className: "text-green-400 bg-green-500/10" },
    failed:   { label: t("commissionHistory.status.failed"),   icon: XCircle,      className: "text-red-400 bg-red-500/10" },
    refunded: { label: t("commissionHistory.status.refunded"), icon: XCircle,      className: "text-gray-400 bg-gray-500/10" },
  };

  const getLevelLabel = (level: number) => {
    if (level === 1) return t("commissionHistory.level1");
    if (level === 2) return t("commissionHistory.level2");
    if (level === 3) return t("commissionHistory.level3");
    return t("commissionHistory.levelN", { level });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CM", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " FCFA";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-noir-light/50 animate-pulse" />)}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowDownRight className="h-12 w-12 text-cream/20 mx-auto mb-4" />
        <p className="text-cream/60">{t("commissionHistory.empty")}</p>
        <p className="text-cream/40 text-sm mt-1">{t("commissionHistory.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {commissions.map((commission, index) => {
        const status = STATUS_CONFIG[commission.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
        const StatusIcon = status.icon;
        return (
          <motion.div
            key={commission.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-4 rounded-lg bg-noir-light/30 border border-gold/10 hover:border-gold/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <ArrowDownRight className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-cream font-medium">+{formatCurrency(commission.commission_amount)}</span>
                <span className="text-cream/40 text-xs">({commission.commission_rate}%)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-cream/60">{getLevelLabel(commission.level)}</span>
                <span className="text-cream/30">•</span>
                <span className="text-cream/50">{t("commissionHistory.orderLabel")}: {formatCurrency(commission.order_amount)}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.className}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </div>
              <p className="text-cream/40 text-xs mt-1">
                {format(new Date(commission.created_at), "d MMM yyyy", { locale: dateFnsLocale })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
