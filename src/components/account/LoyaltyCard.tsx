import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Gift, Trophy, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface LoyaltyData {
  total_points: number;
  lifetime_points: number;
  tier: string;
}

interface LoyaltyConfig {
  points_per_fcfa: number;
  fcfa_per_point: number;
  min_points_redeem: number;
  points_value_fcfa: number;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
  balance_after: number;
}

const tierConfig = {
  bronze: { 
    color: "bg-amber-700", 
    labelKey: "loyalty.tier.bronze", 
    icon: "🥉",
    nextTier: "silver",
    pointsNeeded: 2000,
  },
  silver: { 
    color: "bg-gray-400", 
    labelKey: "loyalty.tier.silver", 
    icon: "🥈",
    nextTier: "gold",
    pointsNeeded: 5000,
  },
  gold: { 
    color: "bg-yellow-500", 
    labelKey: "loyalty.tier.gold", 
    icon: "🥇",
    nextTier: "platinum",
    pointsNeeded: 10000,
  },
  platinum: { 
    color: "bg-gradient-to-r from-gray-300 to-gray-500", 
    labelKey: "loyalty.tier.platinum", 
    icon: "💎",
    nextTier: null,
    pointsNeeded: null,
  },
};

export function LoyaltyCard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch loyalty data
      const { data: loyaltyData } = await supabase
        .from("user_loyalty")
        .select("total_points, lifetime_points, tier")
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch config
      const { data: configData } = await supabase
        .from("loyalty_config")
        .select("points_per_fcfa, fcfa_per_point, min_points_redeem, points_value_fcfa")
        .eq("is_active", true)
        .single();

      // Fetch recent transactions
      const { data: transData } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setLoyalty(loyaltyData || { total_points: 0, lifetime_points: 0, tier: "bronze" });
      setConfig(configData);
      setTransactions(transData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="bg-noir border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const tier = tierConfig[loyalty?.tier as keyof typeof tierConfig] || tierConfig.bronze;
  const nextTier = tier.nextTier ? tierConfig[tier.nextTier as keyof typeof tierConfig] : null;
  const pointsToNext = nextTier ? (nextTier.pointsNeeded || 0) - (loyalty?.lifetime_points || 0) : 0;
  const progressToNext = nextTier
    ? Math.min(100, ((loyalty?.lifetime_points || 0) / (nextTier.pointsNeeded || 1)) * 100)
    : 100;

  const potentialDiscount = config
    ? Math.floor((loyalty?.total_points || 0) / config.min_points_redeem) * config.min_points_redeem * config.points_value_fcfa
    : 0;

  const formatPoints = (points: number) => new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "fr-FR").format(points);
  const dateLocale = i18n.language === "en" ? enUS : fr;

  return (
    <Card className="bg-noir border-gold/20 overflow-hidden">
      {/* Header with tier badge */}
      <div className={`${tier.color} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{tier.icon}</span>
            <div>
              <h3 className="font-display font-bold text-white text-lg">
                {t("loyalty.title")}
              </h3>
              <Badge className="bg-white/20 text-white border-0">
                {t("loyalty.level", { tier: t(tier.labelKey) })}
              </Badge>
            </div>
          </div>
          <Trophy className="h-8 w-8 text-white/80" />
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Points Balance */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
          <div>
            <p className="text-sm text-cream/60">{t("loyalty.points")}</p>
            <p className="text-3xl font-bold text-primary">
              {formatPoints(loyalty?.total_points || 0)}
            </p>
            <p className="text-xs text-cream/50 mt-1">
              {t("loyalty.equivalent", { amount: formatPoints(potentialDiscount) })}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream/60">{t("loyalty.nextTier", { tier: t(nextTier.labelKey) })}</span>
              <span className="text-primary font-medium">
                {t("loyalty.pointsRemaining", { count: formatPoints(pointsToNext) as any })}
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* How it works */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-cream/5 border border-gold/10">
            <TrendingUp className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-xs text-cream/60">{t("loyalty.earn")}</p>
            <p className="text-sm text-cream font-medium">
              {t("loyalty.earnRate", { amount: formatPoints(config?.fcfa_per_point || 100) })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-cream/5 border border-gold/10">
            <Gift className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-cream/60">{t("loyalty.redeem")}</p>
            <p className="text-sm text-cream font-medium">
              {t("loyalty.redeemRate", { points: config?.min_points_redeem || 500 })}
            </p>
          </div>
        </div>

        {/* History button */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-gold/30 text-cream hover:bg-cream/10"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t("loyalty.viewHistory")}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-noir border-gold/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-cream flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                {t("loyalty.historyTitle")}
              </DialogTitle>
              <DialogDescription className="text-cream/60">
                {t("loyalty.historyDesc")}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[400px]">
              {transactions.length === 0 ? (
                <div className="py-8 text-center">
                  <Star className="h-10 w-10 text-cream/20 mx-auto mb-3" />
                  <p className="text-cream/60">{t("loyalty.emptyTitle")}</p>
                  <p className="text-cream/40 text-sm">
                    {t("loyalty.emptyDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-cream/5"
                    >
                      <div>
                        <p className="text-sm text-cream">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-xs text-cream/50">
                          {format(new Date(tx.created_at), "d MMM yyyy", { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.points > 0 ? "text-green-500" : "text-red-500"
                        }`}>
                          {tx.points > 0 ? "+" : ""}{formatPoints(tx.points)} pts
                        </p>
                        <p className="text-xs text-cream/50">
                          {t("loyalty.balance", { value: formatPoints(tx.balance_after) })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
