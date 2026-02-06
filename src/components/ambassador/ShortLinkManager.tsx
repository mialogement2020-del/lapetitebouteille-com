import { useState, useEffect } from "react";
import { Link2, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function ShortLinkManager() {
  const { user } = useAuthContext();
  const [referralCode, setReferralCode] = useState<string>("");
  const [customCode, setCustomCode] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [newCustomCode, setNewCustomCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralCode();
    }
  }, [user]);

  const loadReferralCode = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("referral_codes")
      .select("code, custom_code")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setReferralCode(data.code);
      setCustomCode(data.custom_code || "");
      setNewCustomCode(data.custom_code || "");
    }
  };

  const shortLink = `${window.location.origin}/r/${customCode || referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      toast.success("Lien court copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleSaveCustomCode = async () => {
    if (!user || !newCustomCode.trim()) return;

    // Validate format
    if (!/^[A-Za-z0-9_-]+$/.test(newCustomCode)) {
      toast.error("Le code ne peut contenir que des lettres, chiffres, tirets et underscores");
      return;
    }

    if (newCustomCode.length < 3 || newCustomCode.length > 20) {
      toast.error("Le code doit faire entre 3 et 20 caractères");
      return;
    }

    setIsSaving(true);

    try {
      // Check if code is already taken
      const { data: existing } = await supabase
        .from("referral_codes")
        .select("id")
        .or(`code.eq.${newCustomCode},custom_code.eq.${newCustomCode}`)
        .neq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("Ce code est déjà utilisé par un autre ambassadeur");
        setIsSaving(false);
        return;
      }

      // Update custom code
      const { error } = await supabase
        .from("referral_codes")
        .update({ custom_code: newCustomCode.toUpperCase() })
        .eq("user_id", user.id);

      if (error) throw error;

      setCustomCode(newCustomCode.toUpperCase());
      setIsEditing(false);
      toast.success("Lien personnalisé mis à jour !");
    } catch (error) {
      console.error("Error saving custom code:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-noir-light border-gold/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cream">
          <Link2 className="h-5 w-5 text-primary" />
          Lien Court de Parrainage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Short Link */}
        <div className="bg-noir/50 rounded-xl p-4 border border-gold/10">
          <Label className="text-cream/60 text-xs mb-2 block">Votre lien court</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-primary font-mono text-sm bg-noir/50 px-3 py-2 rounded-lg overflow-hidden text-ellipsis">
              {shortLink}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="border-cream/20 text-cream hover:bg-cream/5 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="border-cream/20 text-cream hover:bg-cream/5 shrink-0"
              onClick={() => window.open(shortLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Customize Code */}
        {!isEditing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 text-primary">
                {customCode || referralCode}
              </Badge>
              {customCode && (
                <Badge className="bg-primary/20 text-primary text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Personnalisé
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-cream/70 hover:text-cream"
              onClick={() => setIsEditing(true)}
            >
              Personnaliser
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div>
              <Label className="text-cream/70 text-sm">Personnalisez votre code</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-cream/50 text-sm">{window.location.origin}/r/</span>
                <Input
                  value={newCustomCode}
                  onChange={(e) => setNewCustomCode(e.target.value.toUpperCase())}
                  placeholder="MONCODE"
                  className="bg-noir/50 border-cream/20 text-cream max-w-[150px] font-mono"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-cream/40 mt-1">
                3-20 caractères : lettres, chiffres, tirets, underscores
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gradient-gold text-noir"
                onClick={handleSaveCustomCode}
                disabled={isSaving || !newCustomCode.trim()}
              >
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-cream/70"
                onClick={() => {
                  setIsEditing(false);
                  setNewCustomCode(customCode);
                }}
              >
                Annuler
              </Button>
            </div>
          </motion.div>
        )}

        {/* Usage Tips */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs text-primary/80">
            💡 <strong>Astuce :</strong> Partagez ce lien court sur vos réseaux sociaux, cartes de visite ou flyers. 
            Chaque visiteur sera automatiquement lié à votre code de parrainage !
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
