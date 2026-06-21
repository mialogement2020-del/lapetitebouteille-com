import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { AlertTriangle, XCircle, CheckCheck, Package, Trash2, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useStockNotifications, StockNotification } from "@/hooks/useStockNotifications";
import { useTranslation } from "react-i18next";

interface StockNotificationsProps {
  enabled?: boolean;
  onProductClick?: (productId: string) => void;
}

export function StockNotifications({ enabled = true, onProductClick }: StockNotificationsProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    soundEnabled,
    toggleSound,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useStockNotifications(enabled);

  const currentLocale = i18n.language === "fr" ? fr : enUS;

  const handleNotificationClick = (notification: StockNotification) => {
    markAsRead(notification.id);
    if (onProductClick && notification.productId) {
      onProductClick(notification.productId);
      setOpen(false);
    }
  };

  const isOutOfStock = (title: string) => title.includes("Rupture");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative border-warning/30 hover:bg-warning/10 hover:border-warning/50"
        >
          <Package className="h-5 w-5 text-warning" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-warning hover:bg-warning/80"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
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
            <Package className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-cream">{t("adminStock.stockNotifications")}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
                {t("adminStock.newNotifications", { count: unreadCount })}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className={`h-8 px-2 text-xs ${
                soundEnabled 
                  ? "text-warning hover:text-warning/80" 
                  : "text-cream/40 hover:text-cream/60"
              }`}
              title={soundEnabled ? "Désactiver le son" : "Activer le son"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 px-2 text-xs text-cream/60 hover:text-warning"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {t("adminStock.markAllRead")}
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
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-warning mx-auto mb-3" />
              <p className="text-cream/60 text-sm">{t("adminStock.loading")}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-10 w-10 text-cream/20 mx-auto mb-3" />
              <p className="text-cream/60 text-sm">Aucune alerte de stock</p>
              <p className="text-cream/40 text-xs mt-1">
                Les alertes de stock critique apparaîtront ici en temps réel
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gold/10">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 cursor-pointer transition-colors hover:bg-cream/5 ${
                    !notification.isRead ? "bg-warning/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isOutOfStock(notification.title)
                          ? "bg-destructive/20 text-destructive"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {isOutOfStock(notification.title) ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm truncate ${
                          isOutOfStock(notification.title) ? "text-destructive" : "text-warning"
                        }`}>
                          {isOutOfStock(notification.title) ? t("adminStock.outOfStock") : t("adminStock.lowStock")}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-cream/80 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            isOutOfStock(notification.title) 
                              ? "border-destructive/50 text-destructive" 
                              : "border-warning/50 text-warning"
                          }`}
                        >
                          {isOutOfStock(notification.title) ? "Urgent" : "Attention"}
                        </Badge>
                        <span className="text-xs text-cream/40">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: currentLocale,
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-cream/40 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gold/20">
            <p className="text-xs text-center text-cream/40">
              {notifications.length} alerte{notifications.length > 1 ? "s" : ""} de stock
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
