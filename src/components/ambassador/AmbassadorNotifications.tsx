import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Bell, CheckCheck, Gift, TrendingUp, Trash2, Users, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAmbassadorNotifications, AmbassadorNotification } from "@/hooks/useAmbassadorNotifications";
import { useTranslation } from "react-i18next";

interface AmbassadorNotificationsProps {
  enabled?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "commission":
      return TrendingUp;
    case "bonus":
      return Gift;
    case "referral":
      return Users;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "commission":
      return "text-green-500 bg-green-500/20";
    case "bonus":
      return "text-amber-500 bg-amber-500/20";
    case "referral":
      return "text-blue-500 bg-blue-500/20";
    default:
      return "text-primary bg-primary/20";
  }
};

export function AmbassadorNotifications({ enabled = true }: AmbassadorNotificationsProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showNewIndicator, setShowNewIndicator] = useState(false);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const previousCountRef = useRef<number>(0);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAmbassadorNotifications(enabled);

  const dateFnsLocale = i18n.language === "en" ? enUS : fr;

  // Animation duration in milliseconds (configurable)
  const ANIMATION_DURATION_MS = 5000;

  // Detect new notifications arriving
  useEffect(() => {
    if (notifications.length > 0 && previousCountRef.current > 0) {
      const newIds = notifications
        .filter(n => !n.isRead)
        .slice(0, notifications.length - previousCountRef.current)
        .map(n => n.id);
      
      if (newIds.length > 0) {
        setNewNotificationIds(new Set(newIds));
        setShowNewIndicator(true);
        
        // Clear the new indicator after animation duration
        const timer = setTimeout(() => {
          setShowNewIndicator(false);
          setNewNotificationIds(new Set());
        }, ANIMATION_DURATION_MS);
        
        return () => clearTimeout(timer);
      }
    }
    previousCountRef.current = notifications.length;
  }, [notifications]);

  const handleNotificationClick = (notification: AmbassadorNotification) => {
    markAsRead(notification.id);
    setNewNotificationIds(prev => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-gold/20 hover:bg-primary/10"
        >
          <motion.div
            animate={showNewIndicator ? { 
              rotate: [0, -15, 15, -10, 10, 0],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Bell className="h-5 w-5" />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  ...(showNewIndicator ? {
                    boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0.7)", "0 0 0 10px rgba(34, 197, 94, 0)", "0 0 0 0 rgba(34, 197, 94, 0)"]
                  } : {})
                }}
                exit={{ scale: 0 }}
                transition={showNewIndicator ? { 
                  boxShadow: { duration: 1, repeat: 2 }
                } : {}}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-green-500"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Sparkle effect for new notifications */}
          <AnimatePresence>
            {showNewIndicator && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 bg-noir border-gold/20"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gold/20">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-cream">{t("ambassadorNotifications.title")}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {t("ambassadorNotifications.unread", { count: unreadCount })}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 px-2 text-xs text-cream/60 hover:text-primary"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {t("ambassadorNotifications.markAllRead")}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 px-2 text-xs text-cream/60 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-3" />
              <p className="text-cream/60 text-sm">{t("ambassadorNotifications.loading")}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 text-cream/20 mx-auto mb-3" />
              <p className="text-cream/60 text-sm">{t("ambassadorNotifications.empty")}</p>
              <p className="text-cream/40 text-xs mt-1">
                {t("ambassadorNotifications.emptyHint")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gold/10">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                const isNew = newNotificationIds.has(notification.id);
                
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10, x: isNew ? -20 : 0 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      x: 0,
                      backgroundColor: isNew ? "rgba(34, 197, 94, 0.15)" : undefined
                    }}
                    transition={{ 
                      duration: 0.3,
                      backgroundColor: { duration: 0.5, repeat: isNew ? 2 : 0, repeatType: "reverse" }
                    }}
                    className={`p-4 cursor-pointer transition-colors hover:bg-cream/5 ${
                      !notification.isRead ? "bg-primary/5" : ""
                    } ${isNew ? "border-l-2 border-green-500" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <motion.div
                        animate={isNew ? { 
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-cream">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <motion.div 
                              animate={isNew ? { scale: [1, 1.5, 1] } : {}}
                              transition={{ duration: 0.3, repeat: isNew ? 2 : 0 }}
                              className="w-2 h-2 rounded-full bg-green-500 shrink-0" 
                            />
                          )}
                          {isNew && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] font-bold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded"
                            >
                              {t("ambassadorNotifications.new")}
                            </motion.span>
                          )}
                        </div>
                        <p className="text-xs text-cream/60 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-cream/40 mt-2 block">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: dateFnsLocale,
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gold/20">
            <p className="text-xs text-center text-cream/40">
              {t("ambassadorNotifications.count", { count: notifications.length })}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
