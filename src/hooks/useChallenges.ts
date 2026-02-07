import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  bonus_amount: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  badge_icon: string | null;
  badge_color: string | null;
}

export interface ChallengeParticipation {
  id: string;
  challenge_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  bonus_claimed: boolean;
  bonus_claimed_at: string | null;
  challenge?: Challenge;
}

export function useActiveChallenges() {
  return useQuery({
    queryKey: ["active-challenges"],
    queryFn: async (): Promise<Challenge[]> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("ambassador_challenges")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("ends_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });
}

export function useMyChallenges() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["my-challenges", user?.id],
    queryFn: async (): Promise<ChallengeParticipation[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("challenge_participations")
        .select(`
          *,
          challenge:ambassador_challenges (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!user?.id,
  });
}

export function useJoinChallenge() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("challenge_participations")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          current_progress: 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Challenge rejoint !", {
        description: "Votre progression sera suivie automatiquement.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-challenges"] });
    },
    onError: (error: any) => {
      console.error("Error joining challenge:", error);
      toast.error("Impossible de rejoindre le challenge");
    },
  });
}
