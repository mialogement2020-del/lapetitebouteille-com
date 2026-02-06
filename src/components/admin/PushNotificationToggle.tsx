import { Bell, BellOff, Loader2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (isLoading) return;
    
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

  // Get status text for accessibility
  const getStatusText = () => {
    if (!isSupported) return "Notifications push non supportées";
    if (isSubscribed) return "Notifications push activées";
    if (permission === "denied") return "Notifications bloquées par le navigateur";
    return "Notifications push désactivées";
  };

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        className="border-cream/20 text-cream/40 touch-manipulation"
        aria-label="Notifications push non supportées par ce navigateur"
      >
        <BellOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={getStatusText()}
      className={`relative border-gold/30 hover:border-gold/50 touch-manipulation active:scale-95 transition-transform ${
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
      {/* Status indicator dot */}
      <span
        className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-noir pointer-events-none ${
          isSubscribed
            ? "bg-green-500 animate-pulse"
            : permission === "denied"
            ? "bg-red-500"
            : "bg-cream/40"
        }`}
      />
    </Button>
  );
}
