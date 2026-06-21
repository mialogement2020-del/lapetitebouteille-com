import { motion } from "framer-motion";
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Wine,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface AdminStatsProps {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
    totalProducts?: number;
    activeProducts?: number;
    lowStock?: number;
  };
}

export function AdminStats({ stats }: AdminStatsProps) {
  const { t, i18n } = useTranslation();
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR").format(price) + " FCFA";
  };

  const orderStats = [
    { 
      label: t("adminStats.totalOrders"), 
      value: stats.total, 
      icon: Package, 
      color: "text-cream",
      bgColor: "bg-cream/10"
    },
    { 
      label: t("adminStats.pending"), 
      value: stats.pending, 
      icon: Clock, 
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    { 
      label: t("adminStats.inPreparation"), 
      value: stats.confirmed + stats.processing, 
      icon: Package, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    { 
      label: t("adminStats.shipped"), 
      value: stats.shipped, 
      icon: Truck, 
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    },
    { 
      label: t("adminStats.delivered"), 
      value: stats.delivered, 
      icon: CheckCircle, 
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    { 
      label: t("adminStats.cancelled"), 
      value: stats.cancelled, 
      icon: XCircle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
  ];

  const productStats = stats.totalProducts !== undefined ? [
    { 
      label: t("adminStats.totalProducts"), 
      value: stats.totalProducts, 
      icon: Wine, 
      color: "text-cream",
      bgColor: "bg-cream/10"
    },
    { 
      label: t("adminStats.activeProducts"), 
      value: stats.activeProducts || 0, 
      icon: CheckCircle, 
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    { 
      label: t("adminStats.lowStock"), 
      value: stats.lowStock || 0, 
      icon: AlertTriangle, 
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Combined Revenue & Catalogue Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-primary/20 via-noir/50 to-cream/5 border-primary/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Revenue Section */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20 shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-cream/60 text-xs mb-0.5">{t("adminStats.revenue")}</p>
                  <p className="text-2xl font-display font-bold text-primary">
                    {formatPrice(stats.totalRevenue)}
                  </p>
                  <p className="text-cream/50 text-xs">
                    {t("adminStats.validatedOrders", { count: stats.total - stats.cancelled })}
                  </p>
                </div>
              </div>

              {/* Catalogue Section */}
              {stats.totalProducts !== undefined && (
                <div className="flex items-center gap-4 md:border-l md:border-gold/20 md:pl-8">
                  <div className="p-3 rounded-full bg-cream/10 shrink-0">
                    <Wine className="h-6 w-6 text-cream" />
                  </div>
                  <div>
                    <p className="text-cream/60 text-xs mb-0.5">{t("adminStats.catalogue")}</p>
                    <p className="text-2xl font-display font-bold text-cream">
                      {stats.totalProducts} <span className="text-base font-normal text-cream/50">{t("adminStats.productsLabel")}</span>
                    </p>
                    <p className="text-cream/50 text-xs">
                      {t("adminStats.activeAndLow", { active: stats.activeProducts, low: stats.lowStock })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Order Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {orderStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-noir/50 border-gold/20 hover:border-gold/40 transition-colors">
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-cream">{stat.value}</p>
                  <p className="text-cream/60 text-xs">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
