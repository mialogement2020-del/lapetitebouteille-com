import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export function PushNotificationSettings() {
  const { t } = useTranslation("pushNotificationSettings");
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  
  const previousSubscribedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (previousSubscribedRef.current === false && isSubscribed) {
      toast.success(t("toast.autoEnabled"), {
        description: t("toast.autoEnabledDesc"),
        duration: 5000,
      });
    }
    previousSubscribedRef.current = isSubscribed;
  }, [isSubscribed, t]);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t("toast.disabled"));
      } else {
        toast.error(t("toast.disabledError"));
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t("toast.enabled"), {
          description: t("toast.enabledDesc"),
        });
      } else if (permission === "denied") {
        toast.error(t("toast.blockedTitle"), {
          description: t("toast.blockedDesc"),
          duration: 8000,
        });
      } else {
        toast.error(t("toast.enableError"), {
          description: t("toast.enableErrorDesc"),
        });
      }
    }
  };

  if (!isSupported) {
    return (
      <Card className="bg-noir-light/30 border-gold/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-cream text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            {t("notSupported.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-cream/60 text-sm">
            {t("notSupported.description")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-noir-light/30 border-gold/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-cream text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t("title")}
          {isSubscribed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto"
            >
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </motion.span>
          )}
        </CardTitle>
        <CardDescription className="text-cream/60">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={false}
              animate={{
                backgroundColor: isSubscribed ? "rgb(34 197 94 / 0.2)" : "rgb(239 68 68 / 0.2)",
                scale: isLoading ? [1, 1.1, 1] : 1,
              }}
              transition={{ scale: { repeat: isLoading ? Infinity : 0, duration: 0.8 } }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : isSubscribed ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-red-400" />
              )}
            </motion.div>
            <div>
              <p className="text-sm font-medium text-cream">
                {isLoading
                  ? t("statusChecking")
                  : isSubscribed
                    ? t("statusActive")
                    : t("statusInactive")}
              </p>
              <p className="text-xs text-cream/50">
                {isLoading
                  ? t("statusSubChecking")
                  : isSubscribed
                    ? t("statusSubActive")
                    : t("statusSubInactive")}
              </p>
            </div>
          </div>

          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={isSubscribed ? "outline" : "default"}
            size="sm"
            className={
              isSubscribed
                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                : "bg-gradient-gold text-noir hover:opacity-90"
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              t("btnDisable")
            ) : (
              t("btnEnable")
            )}
          </Button>
        </div>

        {permission === "denied" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
          >
            <p className="text-xs text-red-400">
              {t("deniedWarning")}
            </p>
            <ul className="text-xs text-red-400/80 mt-1 ml-4 list-disc space-y-0.5">
              <li>{t("deniedStep1")}</li>
              <li>{t("deniedStep2")}</li>
              <li>{t("deniedStep3")}</li>
            </ul>
          </motion.div>
        )}

        <div className="pt-2 border-t border-gold/10">
          <p className="text-xs text-cream/40">
            {t("alertsFooter")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
