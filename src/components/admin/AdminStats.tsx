import { motion } from "framer-motion";
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle, 
  XCircle,
  TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  };
}

export function AdminStats({ stats }: AdminStatsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const statCards = [
    { 
      label: "Total commandes", 
      value: stats.total, 
      icon: Package, 
      color: "text-cream",
      bgColor: "bg-cream/10"
    },
    { 
      label: "En attente", 
      value: stats.pending, 
      icon: Clock, 
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    { 
      label: "En préparation", 
      value: stats.confirmed + stats.processing, 
      icon: Package, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    { 
      label: "Expédiées", 
      value: stats.shipped, 
      icon: Truck, 
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    },
    { 
      label: "Livrées", 
      value: stats.delivered, 
      icon: CheckCircle, 
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    { 
      label: "Annulées", 
      value: stats.cancelled, 
      icon: XCircle, 
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cream/60 text-sm mb-1">Chiffre d'affaires</p>
                <p className="text-3xl font-display font-bold text-primary">
                  {formatPrice(stats.totalRevenue)}
                </p>
                <p className="text-cream/50 text-xs mt-1">
                  Sur {stats.total - stats.cancelled} commande{stats.total - stats.cancelled > 1 ? "s" : ""} validée{stats.total - stats.cancelled > 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-4 rounded-full bg-primary/20">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
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
