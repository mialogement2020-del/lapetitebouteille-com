import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

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

export function useLoyalty() {
  const { user } = useAuthContext();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoyalty(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
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

      setLoyalty(loyaltyData || { total_points: 0, lifetime_points: 0, tier: "bronze" });
      setConfig(configData);
    } catch (error) {
      console.error("Error fetching loyalty data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateDiscount = useCallback(
    (points: number) => {
      if (!config) return 0;
      return points * config.points_value_fcfa;
    },
    [config]
  );

  const canRedeem = useCallback(
    (points: number) => {
      if (!loyalty || !config) return false;
      return points >= config.min_points_redeem && points <= loyalty.total_points;
    },
    [loyalty, config]
  );

  const redeemPoints = useCallback(
    async (points: number) => {
      if (!user || !canRedeem(points)) {
        toast({
          title: "Erreur",
          description: "Points insuffisants ou minimum non atteint",
          variant: "destructive",
        });
        return null;
      }

      setIsRedeeming(true);

      try {
        const { data, error } = await supabase.rpc("redeem_loyalty_points", {
          _user_id: user.id,
          _points: points,
        });

        if (error) throw error;

        const result = data as { success: boolean; discount_amount?: number; error?: string };

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'utilisation des points");
        }

        // Refresh loyalty data
        await fetchData();

        toast({
          title: "Points utilisés !",
          description: `${points} points convertis en ${new Intl.NumberFormat("fr-FR").format(
            result.discount_amount || 0
          )} FCFA de réduction`,
        });

        return result;
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible d'utiliser les points",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsRedeeming(false);
      }
    },
    [user, canRedeem, fetchData]
  );

  const getMaxRedeemablePoints = useCallback(() => {
    if (!loyalty || !config) return 0;
    // Round down to nearest multiple of min_points_redeem
    return Math.floor(loyalty.total_points / config.min_points_redeem) * config.min_points_redeem;
  }, [loyalty, config]);

  return {
    loyalty,
    config,
    isLoading,
    isRedeeming,
    calculateDiscount,
    canRedeem,
    redeemPoints,
    getMaxRedeemablePoints,
    refetch: fetchData,
  };
}
