import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Shield, User, Crown, Check, X, Loader2, UserPlus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  useAdminPermissions, 
  PERMISSION_LABELS, 
  type AdminUser, 
  type AdminPermission 
} from "@/hooks/useAdminPermissions";
import { useAuthContext } from "@/contexts/AuthContext";

const ALL_PERMISSIONS: AdminPermission[] = [
  'full_access',
  'orders',
  'products',
  'categories',
  'promo_codes',
  'stock',
  'audit',
  'mlm',
  'reviews',
  'loyalty',
  'crm',
  'commercial_calendar',
  'ai_goals',
  'conversation_coach',
  'commercial_assets',
  'academy',
  'business_scores',
  'business_assistant',
  'marketplace_image_studio',
  'marketplace_coach',
  'marketplace_seo',
  'catalogue_intelligence',
  'marketplace_analytics',
];

interface SearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  isAlreadyAdmin: boolean;
}

export const AdminPermissionsManager = () => {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { 
    adminUsers, 
    isLoadingAdminUsers, 
    hasFullAccess,
    setUserPermissions,
    refetchAdminUsers,
  } = useAdminPermissions();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<AdminPermission[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add admin dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Remove admin dialog state
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<AdminUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  if (!hasFullAccess) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-cream/40 mx-auto mb-4" />
          <p className="text-cream/60">
            {t("adminPermissions.noAccess")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      toast({
        title: t("adminPermissions.toast.searchTooShort"),
        description: t("adminPermissions.toast.searchTooShortDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search profiles by email or name
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Check which ones are already admins
      const adminUserIds = adminUsers.map(a => a.id);
      
      setSearchResults((profiles || []).map(p => ({
        ...p,
        isAlreadyAdmin: adminUserIds.includes(p.id),
      })));
    } catch (error) {
      toast({
        title: t("adminPermissions.toast.searchError"),
        description: t("adminPermissions.toast.searchErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string, userEmail: string) => {
    setIsPromoting(true);
    try {
      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError) throw roleError;

      toast({
        title: t("adminPermissions.toast.adminAdded"),
        description: t("adminPermissions.toast.adminAddedDesc", { email: userEmail }),
      });
      
      setIsAddDialogOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      refetchAdminUsers();
    } catch (error: unknown) {
      // Check if it's a duplicate key error
      if (typeof error === "object" && error !== null && "code" in error && error.code === '23505') {
        toast({
          title: t("adminPermissions.toast.alreadyAdmin"),
          description: t("adminPermissions.toast.alreadyAdminDesc"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("adminPermissions.toast.error"),
          description: t("adminPermissions.toast.promoteError"),
          variant: "destructive",
        });
      }
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!userToRemove) return;
    
    setIsRemoving(true);
    try {
      // Remove admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userToRemove.id)
        .eq("role", "admin");

      if (roleError) throw roleError;

      // Also remove all permissions
      const { error: permError } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userToRemove.id);

      if (permError) throw permError;

      toast({
        title: t("adminPermissions.toast.adminRemoved"),
        description: t("adminPermissions.toast.adminRemovedDesc", { email: userToRemove.email }),
      });
      
      setIsRemoveDialogOpen(false);
      setUserToRemove(null);
      refetchAdminUsers();
    } catch (error) {
      toast({
        title: t("adminPermissions.toast.error"),
        description: t("adminPermissions.toast.removeError"),
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleEditUser = (adminUser: AdminUser) => {
    setSelectedUser(adminUser);
    setEditingPermissions([...adminUser.permissions]);
    setIsDialogOpen(true);
  };

  const togglePermission = (permission: AdminPermission) => {
    if (permission === 'full_access') {
      // If toggling full_access, clear all other permissions
      if (editingPermissions.includes('full_access')) {
        setEditingPermissions([]);
      } else {
        setEditingPermissions(['full_access']);
      }
    } else {
      // If selecting a specific permission, remove full_access
      setEditingPermissions(prev => {
        const filtered = prev.filter(p => p !== 'full_access');
        if (prev.includes(permission)) {
          return filtered.filter(p => p !== permission);
        } else {
          return [...filtered, permission];
        }
      });
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    try {
      await setUserPermissions.mutateAsync({
        userId: selectedUser.id,
        permissions: editingPermissions,
      });
      toast({
        title: t("adminPermissions.toast.permissionsUpdated"),
        description: t("adminPermissions.toast.permissionsUpdatedDesc", { name: selectedUser.first_name || selectedUser.email }),
      });
      setIsDialogOpen(false);
      refetchAdminUsers();
    } catch (error) {
      toast({
        title: t("adminPermissions.toast.error"),
        description: t("adminPermissions.toast.updateError"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayName = (adminUser: AdminUser) => {
    if (adminUser.first_name || adminUser.last_name) {
      return `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim();
    }
    return adminUser.email;
  };

  if (isLoadingAdminUsers) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-cream/60 mt-4">{t("adminPermissions.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-cream flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {t("adminPermissions.title")}
              </CardTitle>
              <CardDescription className="text-cream/60">
                {t("adminPermissions.description")}
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-gold text-noir"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("adminPermissions.addAdmin")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-cream/40 mx-auto mb-4" />
              <p className="text-cream/60">{t("adminPermissions.noAdmin")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((adminUser) => (
                <motion.div
                  key={adminUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-noir/30 border border-gold/10 rounded-lg hover:border-gold/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      {adminUser.permissions.includes('full_access') ? (
                        <Crown className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-cream/60" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-cream">
                        {getDisplayName(adminUser)}
                        {adminUser.id === user?.id && (
                          <span className="ml-2 text-xs text-primary">{t("adminPermissions.you")}</span>
                        )}
                      </p>
                      <p className="text-sm text-cream/50">{adminUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {adminUser.permissions.includes('full_access') ? (
                        <Badge className="bg-gradient-gold text-noir text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          {t("adminPermissions.superAdmin")}
                        </Badge>
                      ) : adminUser.permissions.length === 0 ? (
                        <Badge variant="outline" className="border-cream/20 text-cream/40 text-xs">
                          {t("adminPermissions.noPermissions")}
                        </Badge>
                      ) : (
                        adminUser.permissions.slice(0, 3).map(permission => (
                          <Badge 
                            key={permission} 
                            variant="outline" 
                            className="border-primary/30 text-cream/80 text-xs"
                          >
                            {PERMISSION_LABELS[permission].split(' ')[0]}
                          </Badge>
                        ))
                      )}
                      {!adminUser.permissions.includes('full_access') && adminUser.permissions.length > 3 && (
                        <Badge variant="outline" className="border-cream/20 text-cream/50 text-xs">
                          +{adminUser.permissions.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(adminUser)}
                      className="border-gold/30 text-cream hover:bg-gold/10"
                      disabled={adminUser.id === user?.id}
                    >
                      {t("adminPermissions.edit")}
                    </Button>
                    {adminUser.id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUserToRemove(adminUser);
                          setIsRemoveDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-noir border-gold/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cream flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t("adminPermissions.editPermissions")}
            </DialogTitle>
            <DialogDescription className="text-cream/60">
              {selectedUser && getDisplayName(selectedUser)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            <div className="space-y-3 py-4">
              {ALL_PERMISSIONS.map((permission) => {
                const isChecked = editingPermissions.includes(permission);
                const isFullAccessSelected = editingPermissions.includes('full_access');
                const isDisabled = permission !== 'full_access' && isFullAccessSelected;

                return (
                  <div key={permission}>
                    {permission === 'full_access' && <Separator className="bg-gold/20 mb-4" />}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-primary/50 bg-primary/10' 
                          : 'border-gold/10 hover:border-gold/30'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => !isDisabled && togglePermission(permission)}
                        disabled={isDisabled}
                        className="border-gold/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className={`text-sm ${isChecked ? 'text-cream' : 'text-cream/70'}`}>
                        {PERMISSION_LABELS[permission]}
                      </span>
                    </label>
                    {permission === 'full_access' && <Separator className="bg-gold/20 mt-4" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-gold/30 text-cream"
            >
              {t("adminPermissions.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-gold text-noir"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("adminPermissions.saving")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t("adminPermissions.save")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setSearchQuery("");
          setSearchResults([]);
        }
      }}>
        <DialogContent className="bg-noir border-gold/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cream flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t("adminPermissions.addAdminTitle")}
            </DialogTitle>
            <DialogDescription className="text-cream/60">
              {t("adminPermissions.addAdminDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
                <Input
                  placeholder={t("adminPermissions.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
                  className="pl-10 bg-noir/50 border-gold/20 text-cream"
                />
              </div>
              <Button
                onClick={handleSearchUsers}
                disabled={isSearching}
                className="bg-primary text-noir"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminPermissions.search")}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-noir/30 border border-gold/10 rounded-lg"
                    >
                      <div>
                        <p className="text-cream font-medium">
                          {result.first_name || ""} {result.last_name || ""}
                        </p>
                        <p className="text-cream/60 text-sm">{result.email}</p>
                      </div>
                      {result.isAlreadyAdmin ? (
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {t("adminPermissions.alreadyAdmin")}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handlePromoteToAdmin(result.id, result.email || "")}
                          disabled={isPromoting}
                          className="bg-success hover:bg-success/90"
                        >
                          {isPromoting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              {t("adminPermissions.promote")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <p className="text-center text-cream/40 py-4">
                {t("adminPermissions.noUserFound")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Admin Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="bg-noir border-gold/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-cream">{t("adminPermissions.removeTitle")}</DialogTitle>
            <DialogDescription className="text-cream/60">
              {userToRemove && (
                <>
                  <strong>{userToRemove.first_name || userToRemove.email}</strong> {t("adminPermissions.removeDescPrefix")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
              className="border-gold/30 text-cream"
            >
              {t("adminPermissions.cancel")}
            </Button>
            <Button
              onClick={handleRemoveAdmin}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("adminPermissions.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
