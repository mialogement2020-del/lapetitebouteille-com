import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export type AppRole =
  | "admin"
  | "moderator"
  | "user"
  | "customer"
  | "ambassador"
  | "vendor"
  | "wholesaler";

/**
 * Loads all roles assigned to the currently authenticated user.
 * Returns an empty array when signed out.
 */
export const useUserRoles = () => {
  const { user } = useAuthContext();

  const query = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  const has = (role: AppRole) => roles.includes(role);
  const hasAny = (...candidates: AppRole[]) =>
    candidates.some((r) => roles.includes(r));

  return {
    roles,
    isLoading: query.isLoading,
    has,
    hasAny,
    isAdmin: has("admin"),
    isModerator: has("moderator"),
    isAmbassador: has("ambassador"),
    isVendor: has("vendor"),
    isWholesaler: has("wholesaler"),
  };
};