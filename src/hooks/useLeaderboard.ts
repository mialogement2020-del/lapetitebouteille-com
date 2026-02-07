import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  current_rank: string | null;
  badge_color: string | null;
  monthly_earnings: number;
  monthly_orders: number;
  new_referrals: number;
  rank_position: number;
}

export function useMonthlyLeaderboard() {
  return useQuery({
    queryKey: ["monthly-leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from("monthly_leaderboard")
        .select("*")
        .limit(20);

      if (error) throw error;
      return (data as LeaderboardEntry[]) || [];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
