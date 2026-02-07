import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ShareableAsset {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  platform: string;
  image_url: string;
  thumbnail_url: string | null;
  download_count: number;
  display_order: number;
}

export function useShareableAssets(filters?: {
  assetType?: string;
  platform?: string;
}) {
  return useQuery({
    queryKey: ["shareable-assets", filters],
    queryFn: async (): Promise<ShareableAsset[]> => {
      let query = supabase
        .from("shareable_assets")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (filters?.assetType && filters.assetType !== "all") {
        query = query.eq("asset_type", filters.assetType);
      }
      if (filters?.platform && filters.platform !== "all") {
        query = query.or(`platform.eq.${filters.platform},platform.eq.all`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTrackAssetDownload() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      // Increment download count via RPC
      await supabase.rpc("increment_asset_download", { asset_uuid: assetId });

      // Track individual download if user is authenticated
      if (user?.id) {
        await supabase.from("asset_downloads").insert({
          asset_id: assetId,
          user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shareable-assets"] });
    },
  });
}

export async function downloadAsset(
  asset: ShareableAsset,
  trackDownload: (assetId: string) => void
) {
  try {
    // Track the download
    trackDownload(asset.id);

    // Download the image
    const response = await fetch(asset.image_url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${asset.title.replace(/[^a-z0-9]/gi, "_")}.${
      asset.image_url.split(".").pop() || "png"
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Téléchargement réussi", {
      description: `${asset.title} a été téléchargé.`,
    });
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Erreur de téléchargement", {
      description: "Impossible de télécharger l'image.",
    });
  }
}
