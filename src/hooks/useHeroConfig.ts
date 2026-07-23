import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroData {
  media_type: "image" | "video";
  background_url: string;
  video_url: string;
  badge_fr: string;
  badge_en: string;
  title_line1_fr: string;
  title_line1_en: string;
  title_highlight_fr: string;
  title_highlight_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  cta_primary_label_fr: string;
  cta_primary_label_en: string;
  cta_primary_link: string;
  cta_secondary_label_fr: string;
  cta_secondary_label_en: string;
  cta_secondary_link: string;
  active_from?: string;
  active_until?: string;
}

export interface HeroConfigRow {
  id: number;
  published: HeroData;
  draft: Partial<HeroData>;
  updated_at: string;
}

export function useHeroConfig() {
  return useQuery({
    queryKey: ["hero_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as HeroConfigRow | null;
    },
  });
}

export function useSaveHeroDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: Partial<HeroData>) => {
      const { error } = await supabase.from("hero_config")
        .update({ draft: draft as any, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero_config"] }),
  });
}

export function usePublishHero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: HeroData) => {
      const { error } = await supabase.from("hero_config")
        .update({ published: data as any, draft: {} as any, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero_config"] }),
  });
}