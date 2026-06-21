import { Bell, BellOff, Loader2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function PushNotificationToggle() {
  const { t } = useTranslation();
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
        toast.success(t("adminPush.disabled"));
      } else {
        toast.error(t("adminPush.disableError"));
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t("adminPush.enabled"), {
          description: t("adminPush.enabledDesc"),
        });
      } else if (permission === "denied") {
        toast.error(t("adminPush.blocked"), {
          description: t("adminPush.blockedDesc"),
        });
      } else {
        toast.error(t("adminPush.enableError"));
      }
    }
  };

  // Get status text for accessibility
  const getStatusText = () => {
    if (!isSupported) return t("adminPush.notSupported");
    if (isSubscribed) return t("adminPush.statusEnabled");
    if (permission === "denied") return t("adminPush.statusBlocked");
    return t("adminPush.statusDisabled");
  };

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        className="border-cream/20 text-cream/40 touch-manipulation"
        aria-label={t("adminPush.ariaNotSupported")}
      >
        <BellOff className="h-5 w-5" />
      </Button>
    );
  }

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[PushNotificationToggle] Button clicked, isLoading:", isLoading, "isSubscribed:", isSubscribed);
    if (!isLoading) {
      handleToggle();
    }
  };

  return (
    <div 
      onClick={handleClick}
      onTouchStart={handleClick}
      role="button"
      tabIndex={0}
      aria-label={getStatusText()}
      aria-disabled={isLoading}
      className={`relative inline-flex items-center justify-center h-10 w-10 rounded-md border text-sm font-medium transition-all cursor-pointer select-none ${
        isLoading ? "opacity-50 cursor-wait" : ""
      } ${
        isSubscribed
          ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 active:bg-gold/30"
          : "border-gold/30 text-cream/60 hover:text-cream hover:border-gold/50 active:bg-cream/10"
      }`}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin pointer-events-none" />
      ) : isSubscribed ? (
        <BellRing className="h-5 w-5 pointer-events-none" />
      ) : (
        <Bell className="h-5 w-5 pointer-events-none" />
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
    </div>
  );
}
