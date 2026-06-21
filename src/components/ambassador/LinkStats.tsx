import { motion } from "framer-motion";
import { Link2, MousePointer, UserPlus, ShoppingCart, TrendingUp, Percent } from "lucide-react";
import { useReferralCode } from "@/hooks/useAmbassador";
import { useTranslation } from "react-i18next";

export function LinkStats() {
  const { t } = useTranslation();
  const { data: referralCode, isLoading } = useReferralCode();

  const formatNumber = (num: number) => new Intl.NumberFormat("fr-FR").format(num);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-CM", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " FCFA";

  const clicks = referralCode?.total_clicks || 0;
  const signups = referralCode?.total_signups || 0;
  const orders = referralCode?.total_orders || 0;
  const revenue = referralCode?.total_revenue || 0;

  const signupRate = clicks > 0 ? ((signups / clicks) * 100).toFixed(1) : "0";
  const orderRate = signups > 0 ? ((orders / signups) * 100).toFixed(1) : "0";
  const overallConversion = clicks > 0 ? ((orders / clicks) * 100).toFixed(2) : "0";

  const stats = [
    { label: t("linkStats.clicksLabel"), value: formatNumber(clicks), icon: MousePointer, color: "from-blue-500 to-cyan-500", iconBg: "bg-blue-500/20", description: t("linkStats.clicksDesc") },
    { label: t("linkStats.signupsLabel"), value: formatNumber(signups), icon: UserPlus, color: "from-green-500 to-emerald-500", iconBg: "bg-green-500/20", description: t("linkStats.signupsDesc", { rate: signupRate }) },
    { label: t("linkStats.ordersLabel"), value: formatNumber(orders), icon: ShoppingCart, color: "from-purple-500 to-violet-500", iconBg: "bg-purple-500/20", description: t("linkStats.ordersDesc", { rate: orderRate }) },
    { label: t("linkStats.revenueLabel"), value: formatCurrency(revenue), icon: TrendingUp, color: "from-amber-500 to-orange-500", iconBg: "bg-amber-500/20", description: t("linkStats.revenueDesc") },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl text-cream">{t("linkStats.title")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-noir-light/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20"><Link2 className="h-5 w-5 text-primary" /></div>
          <div>
            <h3 className="font-display text-xl text-cream">{t("linkStats.title")}</h3>
            <p className="text-sm text-cream/50">{t("linkStats.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2">
          <Percent className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{t("linkStats.globalConversion", { rate: overallConversion })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative overflow-hidden rounded-xl bg-noir-light/50 border border-gold/10 p-5">
            <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${stat.color}`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.iconBg}`}><stat.icon className="h-5 w-5 text-cream" /></div>
              </div>
              <p className="text-cream/60 text-sm mb-1">{stat.label}</p>
              <p className="font-display text-2xl text-cream mb-1">{stat.value}</p>
              <p className="text-xs text-cream/40">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-noir-light/30 rounded-xl border border-gold/10 p-5">
        <h4 className="text-sm font-medium text-cream/70 mb-4">{t("linkStats.funnel")}</h4>
        <div className="space-y-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-cream/60">{t("linkStats.funnelClicks")}</span>
              <span className="text-sm font-medium text-cream">{formatNumber(clicks)}</span>
            </div>
            <div className="h-2 bg-noir rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }} className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-cream/60">{t("linkStats.funnelSignups")}</span>
              <span className="text-sm font-medium text-cream">{formatNumber(signups)} ({signupRate}%)</span>
            </div>
            <div className="h-2 bg-noir rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: clicks > 0 ? `${(signups / clicks) * 100}%` : "0%" }} transition={{ duration: 0.5, delay: 0.1 }} className="h-full bg-gradient-to-r from-green-500 to-emerald-500" />
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-cream/60">{t("linkStats.funnelOrders")}</span>
              <span className="text-sm font-medium text-cream">{formatNumber(orders)} ({overallConversion}%)</span>
            </div>
            <div className="h-2 bg-noir rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: clicks > 0 ? `${(orders / clicks) * 100}%` : "0%" }} transition={{ duration: 0.5, delay: 0.2 }} className="h-full bg-gradient-to-r from-purple-500 to-violet-500" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
