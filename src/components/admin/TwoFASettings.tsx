import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, ShieldOff, Settings2, Loader2 } from "lucide-react";
import { useAdmin2FA } from "@/hooks/useAdmin2FA";
import { TwoFASetupDialog } from "./TwoFASetupDialog";
import { TwoFAVerifyDialog } from "./TwoFAVerifyDialog";

export function TwoFASettings() {
  const { t, i18n } = useTranslation();
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
                {t("admin2FA.title")}
              </CardTitle>
              <CardDescription>
                {t("admin2FA.description")}
              </CardDescription>
            </div>
            <Badge 
              variant={status?.is_enabled ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              {status?.is_enabled ? (
                <>
                  <ShieldCheck className="h-3 w-3" />
                  {t("admin2FA.enabled")}
                </>
              ) : (
                <>
                  <ShieldOff className="h-3 w-3" />
                  {t("admin2FA.disabled")}
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <p className="font-medium">
                {status?.is_enabled ? t("admin2FA.activeMsg") : t("admin2FA.enableMsg")}
              </p>
              <p className="text-sm text-muted-foreground">
                {status?.is_enabled ? t("admin2FA.sensitiveDesc") : t("admin2FA.recommendedDesc")}
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
                <span className="text-muted-foreground">{t("admin2FA.backupCodes")}</span>
                <span className={status.has_backup_codes ? "text-success" : "text-warning"}>
                  {status.has_backup_codes ? t("admin2FA.configured") : t("admin2FA.notConfigured")}
                </span>
              </div>
              
              {status.last_verified_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("admin2FA.lastVerification")}</span>
                  <span>
                    {new Date(status.last_verified_at).toLocaleString(i18n.language?.startsWith("en") ? "en-US" : "fr-FR")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("admin2FA.session")}</span>
                <Badge variant={status.session_valid ? "outline" : "destructive"} className="text-xs">
                  {status.session_valid ? t("admin2FA.valid") : t("admin2FA.expired")}
                </Badge>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleEnableClick}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t("admin2FA.reconfigure")}
              </Button>
            </div>
          )}

          {!status?.is_enabled && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">{t("admin2FA.protectedOps")}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("admin2FA.op1")}</li>
                <li>• {t("admin2FA.op2")}</li>
                <li>• {t("admin2FA.op3")}</li>
                <li>• {t("admin2FA.op4")}</li>
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
        title={t("admin2FA.disableTitle")}
        description={t("admin2FA.disableDesc")}
      />
    </>
  );
}
