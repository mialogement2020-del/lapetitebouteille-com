import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HistoryEntry {
  id: string;
  category_id: string | null;
  action: string;
  snapshot: any;
  changed_by: string | null;
  changed_at: string;
  changed_by_profile?: { email: string | null; first_name: string | null; last_name: string | null } | null;
}

export function useHomeCategoriesHistory(categoryId?: string) {
  return useQuery({
    queryKey: ["home_categories_history", categoryId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("home_categories_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(100);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as HistoryEntry[];
      const userIds = Array.from(new Set(rows.map(r => r.changed_by).filter(Boolean))) as string[];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds);
        const map = new Map((profiles ?? []).map(p => [p.id, p]));
        rows.forEach(r => { if (r.changed_by) r.changed_by_profile = map.get(r.changed_by) ?? null; });
      }
      return rows;
    },
  });
}

export function useRollbackHomeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: HistoryEntry) => {
      const snap = entry.snapshot ?? {};
      const { id, created_at, updated_at, ...payload } = snap;
      if (!id) throw new Error("Snapshot invalide");
      if (entry.action === "delete") {
        // restore
        const { error } = await supabase.from("home_categories").insert({ id, ...payload });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_categories").update(payload).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home_categories"] });
      qc.invalidateQueries({ queryKey: ["home_categories_history"] });
    },
  });
}