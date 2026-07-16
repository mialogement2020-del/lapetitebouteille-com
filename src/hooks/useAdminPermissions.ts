import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export type AdminPermission = 
  | 'orders'
  | 'products'
  | 'categories'
  | 'promo_codes'
  | 'stock'
  | 'audit'
  | 'mlm'
  | 'reviews'
  | 'loyalty'
  | 'crm'
  | 'commercial_calendar'
  | 'ai_goals'
  | 'conversation_coach'
  | 'commercial_assets'
  | 'academy'
  | 'business_scores'
  | 'business_assistant'
  | 'full_access';

export interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  permissions: AdminPermission[];
}

export interface AdminPermissionRecord {
  id: string;
  user_id: string;
  permission: AdminPermission;
  granted_by: string | null;
  granted_at: string | null;
}

// Map tabs to required permissions
export const TAB_PERMISSIONS: Record<string, AdminPermission[]> = {
  performance: ['full_access', 'orders', 'products'], // Visible if any of these
  orders: ['orders'],
  products: ['products'],
  pricing: ['products'],
  categories: ['categories'],
  'promo-codes': ['promo_codes'],
  reviews: ['reviews'],
  loyalty: ['loyalty'],
  'advisor-crm': ['crm', 'mlm', 'orders'],
  'opportunity-calendar': ['commercial_calendar', 'crm'],
  'ai-goals': ['ai_goals', 'commercial_calendar', 'crm'],
  'conversation-coach': ['conversation_coach', 'ai_goals', 'commercial_calendar', 'crm'],
  'commercial-assets': ['commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm'],
  academy: ['academy', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm'],
  'business-scores': ['business_scores', 'academy', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm'],
  'business-assistant': ['business_assistant', 'business_scores', 'academy', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm'],
  restock: ['stock', 'products'],
  'stock-alerts': ['stock'],
  audit: ['audit'],
  mlm: ['mlm'],
};

// Permission labels for UI
export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  full_access: '👑 Super Admin (Accès total)',
  orders: '📦 Gestion des commandes',
  products: '🍷 Gestion des produits',
  categories: '📂 Gestion des catégories',
  promo_codes: '🎟️ Gestion des codes promo',
  stock: '📊 Gestion des stocks & alertes',
  audit: '📋 Consultation des audits',
  mlm: '💰 Gestion MLM & retraits',
  reviews: '⭐ Modération des avis',
  loyalty: '🎁 Gestion fidélité & points',
  crm: 'CRM Conseiller LPB',
  commercial_calendar: 'Calendrier IA commercial',
  ai_goals: 'Objectifs IA Conseiller',
  conversation_coach: 'Coach IA Conversationnel',
  commercial_assets: 'Generateur IA de supports commerciaux',
  academy: 'LPB Academy & Certification',
  business_scores: 'Business Score & Trust Score',
  business_assistant: 'LPB Business Assistant IA',
};

export const useAdminPermissions = () => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Fetch current user's permissions
  const { data: myPermissions = [], isLoading: isLoadingMyPermissions } = useQuery({
    queryKey: ["my-admin-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("admin_permissions")
        .select("permission")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return (data || []).map(p => p.permission as AdminPermission);
    },
    enabled: !!user?.id,
  });

  // Check if current user has full access (super admin)
  // IMPORTANT: If user has NO permissions configured, they get full access by default
  // This ensures backward compatibility with existing admins
  const hasNoPermissionsConfigured = !isLoadingMyPermissions && myPermissions.length === 0;
  const hasFullAccess = myPermissions.includes('full_access') || hasNoPermissionsConfigured;

  // Check if user has a specific permission
  const hasPermission = (permission: AdminPermission): boolean => {
    // If no permissions configured, allow all (backward compatibility)
    if (hasNoPermissionsConfigured) return true;
    return hasFullAccess || myPermissions.includes(permission);
  };

  // Check if user can access a tab
  const canAccessTab = (tabId: string): boolean => {
    // If no permissions configured, allow all tabs
    if (hasNoPermissionsConfigured) return true;
    const requiredPermissions = TAB_PERMISSIONS[tabId];
    if (!requiredPermissions) return true;
    return requiredPermissions.some(p => hasPermission(p));
  };

  // Fetch all admin users with their permissions (only for super admins)
  const { data: adminUsers = [], isLoading: isLoadingAdminUsers, refetch: refetchAdminUsers } = useQuery({
    queryKey: ["admin-users-permissions"],
    queryFn: async () => {
      // First get all admin users
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (rolesError) throw rolesError;
      if (!adminRoles?.length) return [];

      const adminUserIds = adminRoles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", adminUserIds);

      if (profilesError) throw profilesError;

      // Get permissions for these users
      const { data: permissions, error: permError } = await supabase
        .from("admin_permissions")
        .select("*")
        .in("user_id", adminUserIds);

      if (permError) throw permError;

      // Build the result
      return (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        permissions: (permissions || [])
          .filter(p => p.user_id === profile.id)
          .map(p => p.permission as AdminPermission),
      })) as AdminUser[];
    },
    enabled: hasFullAccess,
  });

  // Grant permission to a user
  const grantPermission = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: AdminPermission }) => {
      const { error } = await supabase
        .from("admin_permissions")
        .insert({
          user_id: userId,
          permission: permission as any, // Type assertion - loyalty enum added via migration
          granted_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-permissions"] });
    },
  });

  // Revoke permission from a user
  const revokePermission = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: AdminPermission }) => {
      const { error } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId)
        .eq("permission", permission as any); // Type assertion - loyalty enum added via migration

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-permissions"] });
    },
  });

  // Set all permissions for a user (replace existing)
  const setUserPermissions = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: AdminPermission[] }) => {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissions.length > 0) {
        const { error: insertError } = await supabase
          .from("admin_permissions")
          .insert(
            permissions.map(p => ({
              user_id: userId,
              permission: p as any, // Type assertion - loyalty enum added via migration
              granted_by: user?.id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-permissions"] });
    },
  });

  return {
    myPermissions,
    isLoadingMyPermissions,
    hasFullAccess,
    hasNoPermissionsConfigured,
    hasPermission,
    canAccessTab,
    adminUsers,
    isLoadingAdminUsers,
    refetchAdminUsers,
    grantPermission,
    revokePermission,
    setUserPermissions,
  };
};
