import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BackInStockAlert {
  id: string;
  product_id: string;
  email: string | null;
  phone: string | null;
  is_notified: boolean;
  created_at: string;
}

export function useBackInStockAlerts(productId?: string) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Check if user has an alert for this product
  const { data: hasAlert, isLoading: checkingAlert } = useQuery({
    queryKey: ["back-in-stock-alert", productId, user?.id],
    queryFn: async () => {
      if (!productId) return false;

      const query = supabase
        .from("back_in_stock_alerts")
        .select("id")
        .eq("product_id", productId)
        .eq("is_notified", false);

      if (user?.id) {
        query.eq("user_id", user.id);
      }

      const { data, error } = await query.maybeSingle();
      if (error) return false;
      return !!data;
    },
    enabled: !!productId,
  });

  // Subscribe to alert
  const subscribe = useMutation({
    mutationFn: async ({
      productId,
      email,
      phone,
    }: {
      productId: string;
      email?: string;
      phone?: string;
    }) => {
      const alertData: any = {
        product_id: productId,
        is_notified: false,
      };

      if (user?.id) {
        alertData.user_id = user.id;
      }

      if (email) alertData.email = email;
      if (phone) alertData.phone = phone;

      const { error } = await supabase
        .from("back_in_stock_alerts")
        .insert(alertData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerte activée", {
        description: "Vous serez notifié dès que ce produit sera de retour en stock.",
      });
      queryClient.invalidateQueries({ queryKey: ["back-in-stock-alert"] });
    },
    onError: (error: any) => {
      console.error("Error subscribing to alert:", error);
      toast.error("Erreur", {
        description: "Impossible d'activer l'alerte. Veuillez réessayer.",
      });
    },
  });

  // Unsubscribe from alert
  const unsubscribe = useMutation({
    mutationFn: async (productId: string) => {
      const query = supabase
        .from("back_in_stock_alerts")
        .delete()
        .eq("product_id", productId);

      if (user?.id) {
        query.eq("user_id", user.id);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerte désactivée");
      queryClient.invalidateQueries({ queryKey: ["back-in-stock-alert"] });
    },
  });

  return {
    hasAlert: hasAlert || false,
    checkingAlert,
    subscribe: subscribe.mutate,
    unsubscribe: unsubscribe.mutate,
    isSubscribing: subscribe.isPending,
    isUnsubscribing: unsubscribe.isPending,
  };
}
