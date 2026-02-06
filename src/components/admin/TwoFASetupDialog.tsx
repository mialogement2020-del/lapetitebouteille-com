import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Copy, Check, Key, Smartphone, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TwoFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setupData: {
    secret: string;
    totp_url: string;
    backup_codes: string[];
  } | null;
  onVerify: (code: string) => Promise<boolean>;
  loading: boolean;
}

export function TwoFASetupDialog({
  open,
  onOpenChange,
  setupData,
  onVerify,
  loading
}: TwoFASetupDialogProps) {
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"setup" | "backup" | "verify">("setup");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const { toast } = useToast();

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast({ title: "Clé secrète copiée" });
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData?.backup_codes) {
      await navigator.clipboard.writeText(setupData.backup_codes.join("\n"));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
      toast({ title: "Codes de secours copiés" });
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    const success = await onVerify(code);
    if (success) {
      setCode("");
      setStep("setup");
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setStep("setup");
    onOpenChange(false);
  };

  if (!setupData) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configuration de l'authentification 2FA
          </DialogTitle>
          <DialogDescription>
            Sécurisez votre compte administrateur avec l'authentification à deux facteurs
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={(v) => setStep(v as typeof step)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">1. Scanner</TabsTrigger>
            <TabsTrigger value="backup">2. Sauvegarder</TabsTrigger>
            <TabsTrigger value="verify">3. Vérifier</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={setupData.totp_url} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scannez ce QR code avec votre application d'authentification 
                (Google Authenticator, Authy, 1Password, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ou entrez la clé manuellement :</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted p-2 rounded text-sm font-mono break-all">
                  {setupData.secret}
                </code>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopySecret}
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setStep("backup")}
            >
              Continuer
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="bg-warning/10 border border-warning rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-warning">Important !</p>
                  <p className="text-sm text-muted-foreground">
                    Sauvegardez ces codes de secours dans un endroit sûr. 
                    Ils vous permettront de récupérer l'accès à votre compte si vous perdez votre appareil.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Codes de secours
                </Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyBackupCodes}
                >
                  {copiedBackup ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-success" />
                      Copiés
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier tout
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-muted p-3 rounded-lg">
                {setupData.backup_codes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1">
                    {code}
                  </code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Chaque code ne peut être utilisé qu'une seule fois.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setStep("verify")}
            >
              J'ai sauvegardé mes codes
            </Button>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Entrez le code à 6 chiffres affiché dans votre application d'authentification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Code de vérification</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleVerify}
              disabled={code.length !== 6 || loading}
            >
              {loading ? "Vérification..." : "Activer le 2FA"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
