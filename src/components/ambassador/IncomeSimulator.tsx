import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Users, Coins } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const COMMISSION_RATES = { level1: 0.08, level2: 0.04, level3: 0.02 };
const RANK_BONUSES: Record<string, number> = { bronze: 0, silver: 0.01, gold: 0.02, diamond: 0.03, elite: 0.04 };

interface SimulationParams {
  directReferrals: number;
  avgOrderValue: number;
  ordersPerReferralPerMonth: number;
  level2Ratio: number;
  level3Ratio: number;
}

function calculateProjectedEarnings(params: SimulationParams, rank: string) {
  const rankBonus = RANK_BONUSES[rank] || 0;
  const level1Orders = params.directReferrals * params.ordersPerReferralPerMonth;
  const level1Revenue = level1Orders * params.avgOrderValue;
  const level1Earnings = level1Revenue * (COMMISSION_RATES.level1 + rankBonus);
  const level2Referrals = params.directReferrals * params.level2Ratio;
  const level2Orders = level2Referrals * params.ordersPerReferralPerMonth;
  const level2Revenue = level2Orders * params.avgOrderValue;
  const level2Earnings = level2Revenue * (COMMISSION_RATES.level2 + rankBonus);
  const level3Referrals = level2Referrals * params.level3Ratio;
  const level3Orders = level3Referrals * params.ordersPerReferralPerMonth;
  const level3Revenue = level3Orders * params.avgOrderValue;
  const level3Earnings = level3Revenue * (COMMISSION_RATES.level3 + rankBonus);
  return {
    level1Earnings, level2Earnings, level3Earnings,
    totalMonthly: level1Earnings + level2Earnings + level3Earnings,
    totalAnnual: (level1Earnings + level2Earnings + level3Earnings) * 12,
    totalNetwork: params.directReferrals + level2Referrals + level3Referrals,
  };
}

export function IncomeSimulator({ currentRank = "bronze" }: { currentRank?: string }) {
  const { t } = useTranslation();
  const [params, setParams] = useState<SimulationParams>({
    directReferrals: 10, avgOrderValue: 25000, ordersPerReferralPerMonth: 1, level2Ratio: 2, level3Ratio: 1.5,
  });
  const projections = useMemo(() => calculateProjectedEarnings(params, currentRank), [params, currentRank]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
          <Calculator className="h-5 w-5 text-noir" />
        </div>
        <div>
          <h3 className="font-display text-xl text-cream">{t("incomeSimulator.title")}</h3>
          <p className="text-sm text-cream/60">{t("incomeSimulator.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-6 bg-noir-light/30 rounded-xl p-6 border border-gold/10">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-cream/80 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {t("incomeSimulator.directReferrals")}
            </label>
            <Badge variant="outline" className="border-gold/30 text-cream">{params.directReferrals}</Badge>
          </div>
          <Slider value={[params.directReferrals]} onValueChange={([v]) => setParams(p => ({ ...p, directReferrals: v }))} min={1} max={100} step={1} className="py-2" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-cream/80 flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              {t("incomeSimulator.avgOrder")}
            </label>
            <Badge variant="outline" className="border-gold/30 text-cream">{formatPrice(params.avgOrderValue)}</Badge>
          </div>
          <Slider value={[params.avgOrderValue]} onValueChange={([v]) => setParams(p => ({ ...p, avgOrderValue: v }))} min={10000} max={100000} step={5000} className="py-2" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-cream/80 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("incomeSimulator.ordersPerMonth")}
            </label>
            <Badge variant="outline" className="border-gold/30 text-cream">{params.ordersPerReferralPerMonth}</Badge>
          </div>
          <Slider value={[params.ordersPerReferralPerMonth]} onValueChange={([v]) => setParams(p => ({ ...p, ordersPerReferralPerMonth: v }))} min={0.5} max={4} step={0.5} className="py-2" />
        </div>
      </div>

      <motion.div key={JSON.stringify(projections)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30">
        <h4 className="text-cream font-medium mb-4">{t("incomeSimulator.estimatedEarnings")}</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream/70">{t("incomeSimulator.level1")}</span>
            <span className="text-cream font-medium">{formatPrice(projections.level1Earnings)}{t("incomeSimulator.perMonth")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream/70">{t("incomeSimulator.level2")}</span>
            <span className="text-cream font-medium">{formatPrice(projections.level2Earnings)}{t("incomeSimulator.perMonth")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream/70">{t("incomeSimulator.level3")}</span>
            <span className="text-cream font-medium">{formatPrice(projections.level3Earnings)}{t("incomeSimulator.perMonth")}</span>
          </div>
          <div className="border-t border-primary/20 my-4" />
          <div className="flex items-center justify-between">
            <span className="text-cream font-medium">{t("incomeSimulator.monthlyTotal")}</span>
            <span className="text-primary font-bold text-xl">{formatPrice(projections.totalMonthly)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cream/70 text-sm">{t("incomeSimulator.annualProjection")}</span>
            <span className="text-success font-semibold">{formatPrice(projections.totalAnnual)}</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream/70">{t("incomeSimulator.networkSize")}</span>
            <Badge className="bg-primary/20 text-primary border-0">{t("incomeSimulator.members", { count: Math.round(projections.totalNetwork) })}</Badge>
          </div>
        </div>
      </motion.div>

      <p className="text-xs text-cream/40 text-center">{t("incomeSimulator.disclaimer")}</p>
    </div>
  );
}
