import { Bell, BellOff, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

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
        toast.success("Notifications push activées !");
      } else if (permission === "denied") {
        toast.error("Notifications bloquées par le navigateur. Vérifiez vos paramètres.");
      } else {
        toast.error("Erreur lors de l'activation");
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
            Votre navigateur ne supporte pas les notifications push.
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
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
            >
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-red-400" />
              )}
            </motion.div>
            <div>
              <p className="text-sm font-medium text-cream">
                {isSubscribed ? "Notifications actives" : "Notifications désactivées"}
              </p>
              <p className="text-xs text-cream/50">
                {isSubscribed
                  ? "Vous recevrez des alertes push"
                  : "Activez pour ne rien manquer"}
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
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">
              ⚠️ Les notifications sont bloquées. Cliquez sur l'icône 🔒 dans la barre d'adresse pour les autoriser.
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gold/10">
          <p className="text-xs text-cream/40">
            Types de notifications : nouvelles commissions, filleuls, bonus de rang
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
