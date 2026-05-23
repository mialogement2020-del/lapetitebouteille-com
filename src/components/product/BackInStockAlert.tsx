import { useState } from "react";
import { Bell, BellOff, Mail, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackInStockAlerts } from "@/hooks/useBackInStockAlerts";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

interface BackInStockAlertProps {
  productId: string;
  productName: string;
}

export function BackInStockAlert({ productId, productName }: BackInStockAlertProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { hasAlert, subscribe, unsubscribe, isSubscribing, isUnsubscribing } =
    useBackInStockAlerts(productId);

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubscribe = () => {
    if (user) {
      // Authenticated user - no email needed
      subscribe({ productId });
    } else {
      // Guest - show email input
      setShowEmailInput(true);
    }
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      subscribe({ productId, email });
      setShowEmailInput(false);
      setEmail("");
    }
  };

  if (hasAlert) {
    return (
      <Button
        variant="outline"
        onClick={() => unsubscribe(productId)}
        disabled={isUnsubscribing}
        className="w-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
      >
        {isUnsubscribing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <BellOff className="h-4 w-4 mr-2" />
        )}
        {t("backInStock.active")}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {showEmailInput ? (
          <motion.form
            key="email-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmitEmail}
            className="flex gap-2"
          >
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("backInStock.emailPlaceholder")}
                required
                className="pl-9 bg-noir-light/50 border-gold/20 text-cream"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubscribing}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("backInStock.ok")
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEmailInput(false)}
              className="text-cream/60"
            >
              {t("backInStock.cancel")}
            </Button>
          </motion.form>
        ) : (
          <motion.div
            key="subscribe-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="outline"
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full border-gold/30 text-cream hover:bg-cream/10 hover:border-gold/50"
            >
              {isSubscribing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              {t("backInStock.subscribe")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-cream/50 text-center">
        {t("backInStock.info", { name: productName })}
      </p>
    </div>
  );
}
