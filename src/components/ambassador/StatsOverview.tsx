import { motion } from "framer-motion";
import { Wallet, Users, TrendingUp, Award, Clock, ShoppingBag } from "lucide-react";
import type { AmbassadorStats } from "@/hooks/useAmbassador";
import { useTranslation } from "react-i18next";

interface StatsOverviewProps {
  stats: AmbassadorStats;
  isLoading: boolean;
}

export function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  const { t } = useTranslation("statsOverview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-CM", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA";
  };

  const RANK_LABELS: Record<string, string> = {
    bronze: t("rank.bronze"),
    silver: t("rank.silver"),
    gold: t("rank.gold"),
    diamond: t("rank.diamond"),
    elite: t("rank.elite"),
  };

  const statCards = [
    { label: t("stat.availableBalance"), value: formatCurrency(stats?.availableBalance || 0), icon: Wallet, color: "from-green-500 to-emerald-600", iconBg: "bg-green-500/20" },
    { label: t("stat.pendingBalance"), value: formatCurrency(stats?.pendingBalance || 0), icon: Clock, color: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/20" },
    { label: t("stat.monthlyEarnings"), value: formatCurrency(stats?.monthlyEarnings || 0), icon: TrendingUp, color: "from-blue-500 to-indigo-600", iconBg: "bg-blue-500/20" },
    { label: t("stat.totalEarnings"), value: formatCurrency(stats?.totalEarnings || 0), icon: Award, color: "from-purple-500 to-violet-600", iconBg: "bg-purple-500/20" },
    { label: t("stat.activeReferrals"), value: `${stats?.activeReferrals || 0} / ${stats?.totalReferrals || 0}`, icon: Users, color: "from-pink-500 to-rose-600", iconBg: "bg-pink-500/20" },
    { label: t("stat.totalOrders"), value: stats?.totalOrders?.toString() || "0", icon: ShoppingBag, color: "from-cyan-500 to-teal-600", iconBg: "bg-cyan-500/20" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-noir-light/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-noir-light to-noir border border-gold/20"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: stats?.rankBadgeColor || "#CD7F32" }}>
          <Award className="h-8 w-8 text-white" />
        </div>
        <div>
          <p className="text-cream/60 text-sm">{t("currentRank")}</p>
          <h3 className="font-display text-2xl text-cream">
            {t("ambassadorRank", { rank: RANK_LABELS[stats?.currentRank] || t("rank.bronze") })}
          </h3>
          <p className="text-cream/50 text-sm">
            {t("activeReferrals", { count: stats?.activeReferrals || 0 })}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-xl bg-noir-light/50 border border-gold/10 p-5"
          >
            <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${stat.color}`} />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className="h-5 w-5 text-cream" />
                </div>
              </div>
              <p className="text-cream/60 text-sm mb-1">{stat.label}</p>
              <p className="font-display text-xl text-cream">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
