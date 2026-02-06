import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, ShieldOff, Settings2, Loader2 } from "lucide-react";
import { useAdmin2FA } from "@/hooks/useAdmin2FA";
import { TwoFASetupDialog } from "./TwoFASetupDialog";
import { TwoFAVerifyDialog } from "./TwoFAVerifyDialog";

export function TwoFASettings() {
  const { 
    status, 
    loading, 
    setupData, 
    initiateSetup, 
    verifySetup, 
    disable 
  } = useAdmin2FA();
  
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const handleEnableClick = async () => {
    const data = await initiateSetup();
    if (data) {
      setShowSetup(true);
    }
  };

  const handleDisable = async (code: string) => {
    const success = await disable(code);
    if (success) {
      setShowDisable(false);
    }
    return success;
  };

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentification à deux facteurs (2FA)
              </CardTitle>
              <CardDescription>
                Sécurisez les opérations sensibles avec une vérification supplémentaire
              </CardDescription>
            </div>
            <Badge 
              variant={status?.is_enabled ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {status?.is_enabled ? (
                <>
                  <ShieldCheck className="h-3 w-3" />
                  Activé
                </>
              ) : (
                <>
                  <ShieldOff className="h-3 w-3" />
                  Désactivé
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <p className="font-medium">
                {status?.is_enabled 
                  ? "La protection 2FA est active" 
                  : "Activer la protection 2FA"
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {status?.is_enabled 
                  ? "Les opérations sensibles nécessiteront une vérification"
                  : "Recommandé pour une sécurité maximale"
                }
              </p>
            </div>
            <Switch
              checked={status?.is_enabled ?? false}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnableClick();
                } else {
                  setShowDisable(true);
                }
              }}
              disabled={loading}
            />
          </div>

          {status?.is_enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Codes de secours</span>
                <span className={status.has_backup_codes ? "text-success" : "text-warning"}>
                  {status.has_backup_codes ? "Configurés" : "Non configurés"}
                </span>
              </div>
              
              {status.last_verified_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dernière vérification</span>
                  <span>
                    {new Date(status.last_verified_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Session 2FA</span>
                <Badge variant={status.session_valid ? "outline" : "destructive"} className="text-xs">
                  {status.session_valid ? "Valide" : "Expirée"}
                </Badge>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleEnableClick}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Reconfigurer le 2FA
              </Button>
            </div>
          )}

          {!status?.is_enabled && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">Opérations protégées par 2FA :</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Approbation des demandes de retrait</li>
                <li>• Modification des permissions admin</li>
                <li>• Suppression de produits/catégories</li>
                <li>• Modification des taux de commission</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <TwoFASetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        setupData={setupData}
        onVerify={verifySetup}
        loading={loading}
      />

      <TwoFAVerifyDialog
        open={showDisable}
        onOpenChange={setShowDisable}
        onVerify={handleDisable}
        loading={loading}
        title="Désactiver le 2FA"
        description="Entrez votre code d'authentification pour confirmer la désactivation"
      />
    </>
  );
}
