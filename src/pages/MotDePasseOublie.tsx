import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function MotDePasseOublie() {
  const { resetPassword } = useAuthContext();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: t("forgotPassword.emailRequiredTitle"),
        description: t("forgotPassword.emailRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await resetPassword(email);

    setIsLoading(false);

    if (error) {
      toast({
        title: t("forgotPassword.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEmailSent(true);
  };

  return (
    <AuthLayout
      title={t("forgotPassword.title")}
      subtitle={t("forgotPassword.subtitle")}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {emailSent ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-cream mb-2">
                {t("forgotPassword.emailSentTitle")}
              </h3>
              <p className="text-cream/60">
                {t("forgotPassword.emailSentDesc", { email })}
              </p>
            </div>
            <Link to="/connexion">
              <Button variant="outline" className="border-gold/30 text-cream hover:bg-cream/10">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("forgotPassword.backToLogin")}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-cream/80">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-cream/10 border-gold/30 text-cream placeholder:text-cream/40 focus:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("forgotPassword.sending")}
                </>
              ) : (
                t("forgotPassword.sendLink")
              )}
            </Button>

            <p className="text-center">
              <Link to="/connexion" className="text-primary hover:underline text-sm">
                <ArrowLeft className="inline mr-1 h-3 w-3" />
                {t("forgotPassword.backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
}
