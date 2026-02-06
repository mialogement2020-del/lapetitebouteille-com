import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, User, Crown, Check, X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
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
];

export const AdminPermissionsManager = () => {
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

  if (!hasFullAccess) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 text-cream/40 mx-auto mb-4" />
          <p className="text-cream/60">
            Seuls les Super Admins peuvent gérer les permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

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
        title: "Permissions mises à jour",
        description: `Les permissions de ${selectedUser.first_name || selectedUser.email} ont été modifiées.`,
      });
      setIsDialogOpen(false);
      refetchAdminUsers();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les permissions",
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
          <p className="text-cream/60 mt-4">Chargement des administrateurs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cream flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Gestion des Permissions Admin
              </CardTitle>
              <CardDescription className="text-cream/60">
                Attribuez des rôles spécifiques à chaque administrateur
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminUsers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-cream/40 mx-auto mb-4" />
              <p className="text-cream/60">Aucun administrateur trouvé</p>
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
                          <span className="ml-2 text-xs text-primary">(vous)</span>
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
                          Super Admin
                        </Badge>
                      ) : adminUser.permissions.length === 0 ? (
                        <Badge variant="outline" className="border-cream/20 text-cream/40 text-xs">
                          Aucune permission
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
                      Modifier
                    </Button>
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
              Modifier les permissions
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
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-gold text-noir"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
