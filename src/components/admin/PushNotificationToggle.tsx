import { Bell, BellOff, Loader2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export function PushNotificationToggle() {
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
        toast.success("Notifications push activées !", {
          description: "Vous recevrez les alertes de stock même quand le navigateur est fermé.",
        });
      } else if (permission === "denied") {
        toast.error("Notifications bloquées", {
          description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur.",
        });
      } else {
        toast.error("Erreur lors de l'activation");
      }
    }
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled
              className="border-cream/20 text-cream/40"
            >
              <BellOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notifications push non supportées par ce navigateur</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggle}
              disabled={isLoading}
              className={`border-gold/30 hover:border-gold/50 ${
                isSubscribed
                  ? "bg-gold/10 text-gold hover:bg-gold/20"
                  : "text-cream/60 hover:text-cream"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isSubscribed ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
            </Button>
            {/* Status indicator dot */}
            <span
              className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-noir ${
                isSubscribed
                  ? "bg-green-500 animate-pulse"
                  : permission === "denied"
                  ? "bg-red-500"
                  : "bg-cream/40"
              }`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isSubscribed
                  ? "bg-green-500"
                  : permission === "denied"
                  ? "bg-red-500"
                  : "bg-cream/40"
              }`}
            />
            <p>
              {isSubscribed
                ? "Notifications push activées"
                : permission === "denied"
                ? "Notifications bloquées par le navigateur"
                : "Notifications push désactivées"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
