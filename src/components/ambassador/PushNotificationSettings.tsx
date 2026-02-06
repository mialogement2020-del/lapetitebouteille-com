import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  
  const previousSubscribedRef = useRef<boolean | null>(null);

  // Show toast when auto-subscription succeeds
  useEffect(() => {
    if (previousSubscribedRef.current === false && isSubscribed) {
      toast.success("Notifications push activées automatiquement !", {
        description: "Vous recevrez des alertes pour vos commissions et filleuls.",
        duration: 5000,
      });
    }
    previousSubscribedRef.current = isSubscribed;
  }, [isSubscribed]);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success("Notifications push désactivées");
      } else {
        toast.error("Erreur lors de la désactivation");
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Notifications push activées !", {
          description: "Vous recevrez maintenant des alertes en temps réel.",
        });
      } else if (permission === "denied") {
        toast.error("Notifications bloquées par le navigateur", {
          description: "Cliquez sur l'icône 🔒 dans la barre d'adresse pour les autoriser.",
          duration: 8000,
        });
      } else {
        toast.error("Erreur lors de l'activation", {
          description: "Veuillez réessayer ou rafraîchir la page.",
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
            Notifications non disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-cream/60 text-sm">
            Votre navigateur ne supporte pas les notifications push. Utilisez Chrome, Firefox ou Edge pour bénéficier de cette fonctionnalité.
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
          Notifications Push
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
          Recevez des alertes en temps réel pour vos commissions, filleuls et bonus
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
                  ? "Vérification en cours..." 
                  : isSubscribed 
                    ? "Notifications actives" 
                    : "Notifications désactivées"}
              </p>
              <p className="text-xs text-cream/50">
                {isLoading
                  ? "Patientez un instant..."
                  : isSubscribed
                    ? "Vous recevrez des alertes push"
                    : "Cliquez pour activer"}
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
              "Désactiver"
            ) : (
              "Activer"
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
              ⚠️ Les notifications sont bloquées par votre navigateur. Pour les activer :
            </p>
            <ul className="text-xs text-red-400/80 mt-1 ml-4 list-disc space-y-0.5">
              <li>Cliquez sur l'icône 🔒 dans la barre d'adresse</li>
              <li>Trouvez "Notifications" et sélectionnez "Autoriser"</li>
              <li>Rafraîchissez la page</li>
            </ul>
          </motion.div>
        )}

        <div className="pt-2 border-t border-gold/10">
          <p className="text-xs text-cream/40">
            📢 Alertes : nouvelles commissions, nouveaux filleuls, bonus de rang
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
