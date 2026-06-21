import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { motion } from "framer-motion";
import { Search, Store, Package, Megaphone, Loader2, X, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRoles";

type MarketplaceRole = Extract<AppRole, "ambassador" | "vendor" | "wholesaler">;

const ROLE_META: Record<MarketplaceRole, { icon: typeof Store; color: string }> = {
  vendor: { icon: Store, color: "bg-primary/20 text-primary border-primary/40" },
  wholesaler: { icon: Package, color: "bg-secondary/20 text-secondary border-secondary/40" },
  ambassador: { icon: Megaphone, color: "bg-green-500/20 text-green-400 border-green-500/40" },
};

interface ProfileWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: AppRole[];
}

const displayName = (p: { first_name: string | null; last_name: string | null; email: string }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email;

export const MarketplaceRolesManager = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // List users currently holding any marketplace role
  const { data: holders = [], isLoading: loadingHolders, refetch: refetchHolders } = useQuery({
    queryKey: ["marketplace-role-holders"],
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["ambassador", "vendor", "wholesaler"]);
      if (error) throw error;

      const byUser = new Map<string, AppRole[]>();
      (data ?? []).forEach((r) => {
        const list = byUser.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        byUser.set(r.user_id, list);
      });
      const ids = Array.from(byUser.keys());
      if (ids.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", ids);
      if (pErr) throw pErr;

      return (profiles ?? []).map((p) => ({
        ...p,
        roles: byUser.get(p.id) ?? [],
      }));
    },
  });

  // Search for users to assign roles to
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["marketplace-roles-search", submittedQuery],
    enabled: submittedQuery.length >= 3,
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      const q = submittedQuery;
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(15);
      if (error) throw error;
      if (!profiles?.length) return [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profiles.map((p) => p.id));

      const byUser = new Map<string, AppRole[]>();
      (roles ?? []).forEach((r) => {
        const list = byUser.get(r.user_id) ?? [];
        list.push(r.role as AppRole);
        byUser.set(r.user_id, list);
      });

      return profiles.map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const refreshAll = () => {
    refetchHolders();
    qc.invalidateQueries({ queryKey: ["marketplace-roles-search"] });
  };

  const assignRole = async (userId: string, role: MarketplaceRole) => {
    const key = `${userId}:${role}:add`;
    setBusyKey(key);
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error && error.code !== "23505") throw error;
      toast({ title: t("adminMarketplaceRoles.toast.assigned"), description: t("adminMarketplaceRoles.toast.assignedDesc", { role: t(`adminMarketplaceRoles.role.${role}`) }) });
      refreshAll();
    } catch (e: any) {
      toast({ title: t("adminMarketplaceRoles.toast.error"), description: e.message ?? t("adminMarketplaceRoles.toast.assignError"), variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const revokeRole = async (userId: string, role: MarketplaceRole) => {
    const key = `${userId}:${role}:remove`;
    setBusyKey(key);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
      toast({ title: t("adminMarketplaceRoles.toast.revoked"), description: t("adminMarketplaceRoles.toast.revokedDesc", { role: t(`adminMarketplaceRoles.role.${role}`) }) });
      refreshAll();
    } catch (e: any) {
      toast({ title: t("adminMarketplaceRoles.toast.error"), description: e.message ?? t("adminMarketplaceRoles.toast.revokeError"), variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const renderRoleControls = (p: ProfileWithRoles) =>
    (Object.keys(ROLE_META) as MarketplaceRole[]).map((role) => {
      const has = p.roles.includes(role);
      const meta = ROLE_META[role];
      const Icon = meta.icon;
      const addKey = `${p.id}:${role}:add`;
      const rmKey = `${p.id}:${role}:remove`;
      const isBusy = busyKey === addKey || busyKey === rmKey;

      return (
        <Button
          key={role}
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => (has ? revokeRole(p.id, role) : assignRole(p.id, role))}
          className={
            has
              ? `${meta.color} hover:opacity-80`
              : "border-cream/20 text-cream/60 hover:border-primary/50 hover:text-cream"
          }
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : has ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <Icon className="h-3.5 w-3.5 ml-1.5" />
          <span className="ml-1.5 text-xs">{t(`adminMarketplaceRoles.role.${role}`)}</span>
        </Button>
      );
    });

  const renderUserRow = (p: ProfileWithRoles) => (
    <motion.div
      key={p.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-noir/30 border border-gold/10 rounded-lg hover:border-gold/30 transition-colors"
    >
      <div>
        <p className="font-medium text-cream">{displayName(p)}</p>
        <p className="text-sm text-cream/50">{p.email}</p>
      </div>
      <div className="flex flex-wrap gap-2">{renderRoleControls(p)}</div>
    </motion.div>
  );

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("adminMarketplaceRoles.title")}
        </CardTitle>
        <CardDescription className="text-cream/60">
          <Trans
            i18nKey="adminMarketplaceRoles.description"
            components={[<strong key="0" />, <strong key="1" />, <strong key="2" />]}
          />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Search */}
        <div>
          <h3 className="text-sm font-semibold text-cream mb-3">{t("adminMarketplaceRoles.searchTitle")}</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSubmittedQuery(searchQuery.trim())}
                placeholder={t("adminMarketplaceRoles.searchPlaceholder")}
                className="pl-10 bg-noir/50 border-gold/20 text-cream"
              />
            </div>
            <Button
              onClick={() => setSubmittedQuery(searchQuery.trim())}
              disabled={searchQuery.trim().length < 3}
              className="bg-gradient-gold text-noir"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminMarketplaceRoles.search")}
            </Button>
          </div>

          {submittedQuery && (
            <div className="mt-4 space-y-2">
              {searching ? (
                <p className="text-sm text-cream/50">{t("adminMarketplaceRoles.searching")}</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-cream/50">{t("adminMarketplaceRoles.noUserFound")}</p>
              ) : (
                searchResults.map(renderUserRow)
              )}
            </div>
          )}
        </div>

        {/* Current holders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-cream">{t("adminMarketplaceRoles.holdersTitle")}</h3>
            <Badge variant="outline" className="border-primary/30 text-cream/70">
              {holders.length}
            </Badge>
          </div>
          {loadingHolders ? (
            <div className="py-8 text-center text-cream/60">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : holders.length === 0 ? (
            <p className="text-sm text-cream/50 py-6 text-center">
              {t("adminMarketplaceRoles.noHolders")}
            </p>
          ) : (
            <div className="space-y-2">{holders.map(renderUserRow)}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};