import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Key } from "lucide-react";

interface TwoFAVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (code: string) => Promise<boolean>;
  loading: boolean;
  title?: string;
  description?: string;
}

export function TwoFAVerifyDialog({
  open,
  onOpenChange,
  onVerify,
  loading,
  title,
  description
}: TwoFAVerifyDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);

  const handleVerify = async () => {
    const isValid = useBackup 
      ? /^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(code)
      : code.length === 6;
    
    if (!isValid) return;
    
    const success = await onVerify(code);
    if (success) {
      setCode("");
      setUseBackup(false);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setUseBackup(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title ?? t("admin2FA.verifyTitle")}
          </DialogTitle>
          <DialogDescription>{description ?? t("admin2FA.verifyDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {useBackup ? (
            <div className="space-y-2">
              <Label htmlFor="backup-code" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {t("admin2FA.backupCode")}
              </Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground">
                {t("admin2FA.backupCodeFormat")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totp-code">{t("admin2FA.authCode")}</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {t("admin2FA.enter6Digits")}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleVerify}
              disabled={loading || (useBackup ? !/^[A-F0-9]{4}-[A-F0-9]{4}$/i.test(code) : code.length !== 6)}
              className="w-full"
            >
              {loading ? t("admin2FA.verifying") : t("admin2FA.verifyBtn")}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCode("");
                setUseBackup(!useBackup);
              }}
              className="text-xs"
            >
              {useBackup ? t("admin2FA.useAuthCode") : t("admin2FA.useBackupCode")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
