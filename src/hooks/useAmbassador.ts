import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface AmbassadorStats {
  totalEarnings: number;
  pendingBalance: number;
  availableBalance: number;
  totalReferrals: number;
  activeReferrals: number;
  currentRank: string;
  rankBadgeColor: string;
  monthlyEarnings: number;
  totalOrders: number;
}

export interface Commission {
  id: string;
  order_id: string;
  order_amount: number;
  commission_rate: number;
  commission_amount: number;
  level: number;
  status: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  level: number;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  rank?: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export function useAmbassadorStats() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["ambassador-stats", user?.id],
    queryFn: async (): Promise<AmbassadorStats> => {
      if (!user?.id) throw new Error("User not authenticated");

      // Fetch wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch user rank
      const { data: userRank } = await supabase
        .from("user_ranks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch rank config for badge color
      const { data: rankConfig } = await supabase
        .from("rank_config")
        .select("*")
        .eq("rank", userRank?.current_rank || "bronze")
        .single();

      // Fetch referral code stats
      const { data: referralCode } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Fetch monthly earnings (commissions from this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyCommissions } = await supabase
        .from("commissions")
        .select("commission_amount")
        .eq("beneficiary_id", user.id)
        .eq("status", "completed")
        .gte("created_at", startOfMonth.toISOString());

      const monthlyEarnings = monthlyCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      return {
        totalEarnings: wallet?.total_earned || 0,
        pendingBalance: wallet?.pending_balance || 0,
        availableBalance: wallet?.balance || 0,
        totalReferrals: userRank?.total_referrals_count || 0,
        activeReferrals: userRank?.active_referrals_count || 0,
        currentRank: userRank?.current_rank || "bronze",
        rankBadgeColor: rankConfig?.badge_color || "#CD7F32",
        monthlyEarnings,
        totalOrders: referralCode?.total_orders || 0,
      };
    },
    enabled: !!user?.id,
  });
}

export function useCommissions() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["commissions", user?.id],
    queryFn: async (): Promise<Commission[]> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("beneficiary_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useReferrals() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async (): Promise<Referral[]> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("referral_relationships")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each referral
      if (data && data.length > 0) {
        const referredIds = data.map((r) => r.referred_id);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", referredIds);

        const { data: ranks } = await supabase
          .from("user_ranks")
          .select("user_id, current_rank")
          .in("user_id", referredIds);

        return data.map((referral) => ({
          ...referral,
          profile: profiles?.find((p) => p.id === referral.referred_id),
          rank: ranks?.find((r) => r.user_id === referral.referred_id)?.current_rank,
        }));
      }

      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useWalletTransactions() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async (): Promise<WalletTransaction[]> => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useReferralCode() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
