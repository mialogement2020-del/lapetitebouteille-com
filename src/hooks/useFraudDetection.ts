import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ReviewStatus = "pending" | "approved" | "rejected" | "auto_blocked";

export interface RiskScore {
  id: string;
  order_id: string;
  score: number;
  risk_level: RiskLevel;
  factors: Array<{ rule: string; weight: number; value?: number; count?: number }>;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number: string;
    total: number;
    shipping_full_name: string | null;
    guest_email: string | null;
    guest_phone: string | null;
    user_id: string | null;
    created_at: string;
  };
}

export interface FraudRule {
  id: string;
  rule_key: string;
  label: string;
  description: string | null;
  threshold: number;
  weight: number;
  is_active: boolean;
}

export interface BlockedEntity {
  id: string;
  entity_type: "email" | "phone" | "ip";
  entity_value: string;
  reason: string | null;
  created_at: string;
}

export function useFraudDetection() {
  const qc = useQueryClient();

  const scoresQuery = useQuery({
    queryKey: ["fraud-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_risk_scores" as any)
        .select(
          "*, order:orders(order_number,total,shipping_full_name,guest_email,guest_phone,user_id,created_at)"
        )
        .order("score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as RiskScore[];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ["fraud-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fraud_rules" as any)
        .select("*")
        .order("weight", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FraudRule[];
    },
  });

  const blockedQuery = useQuery({
    queryKey: ["blocked-entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_entities" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlockedEntity[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      status: ReviewStatus;
      notes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("order_risk_scores" as any)
        .update({
          review_status: input.status,
          review_notes: input.notes ?? null,
          reviewed_by: u.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraud-scores"] });
      toast({ title: "Décision enregistrée" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (rule: Partial<FraudRule> & { id: string }) => {
      const { error } = await supabase
        .from("fraud_rules" as any)
        .update({
          threshold: rule.threshold,
          weight: rule.weight,
          is_active: rule.is_active,
        })
        .eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fraud-rules"] });
      toast({ title: "Règle mise à jour" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (input: {
      entity_type: "email" | "phone" | "ip";
      entity_value: string;
      reason?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("blocked_entities" as any).insert({
        entity_type: input.entity_type,
        entity_value: input.entity_value.trim(),
        reason: input.reason ?? null,
        blocked_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-entities"] });
      toast({ title: "Entité bloquée" });
    },
    onError: (e: any) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blocked_entities" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blocked-entities"] });
      toast({ title: "Débloqué" });
    },
  });

  return {
    scores: scoresQuery.data ?? [],
    scoresLoading: scoresQuery.isLoading,
    rules: rulesQuery.data ?? [],
    blocked: blockedQuery.data ?? [],
    review: reviewMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    block: blockMutation.mutate,
    unblock: unblockMutation.mutate,
  };
}