import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle, XCircle, Clock, Loader2, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { OrderStatusHistory } from "./OrderStatusHistory";
import type { AdminOrder } from "@/hooks/useAdmin";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderStatusDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  isUpdating: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: any; description: string }> = {
  pending: { 
    label: "En attente", 
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", 
    icon: Clock,
    description: "Commande reçue, en attente de confirmation"
  },
  confirmed: { 
    label: "Confirmée", 
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30", 
    icon: CheckCircle,
    description: "Commande confirmée, prête pour préparation"
  },
  processing: { 
    label: "En préparation", 
    color: "bg-purple-500/20 text-purple-500 border-purple-500/30", 
    icon: Package,
    description: "Les articles sont en cours de préparation"
  },
  shipped: { 
    label: "Expédiée", 
    color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30", 
    icon: Truck,
    description: "Commande en cours de livraison"
  },
  delivered: { 
    label: "Livrée", 
    color: "bg-green-500/20 text-green-500 border-green-500/30", 
    icon: CheckCircle,
    description: "Commande livrée avec succès"
  },
  cancelled: { 
    label: "Annulée", 
    color: "bg-red-500/20 text-red-500 border-red-500/30", 
    icon: XCircle,
    description: "Commande annulée"
  },
};

const statusFlow: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function OrderStatusDialog({ order, open, onOpenChange, onUpdateStatus, isUpdating }: OrderStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!order) return null;

  const currentStatus = order.status || "pending";
  const currentIndex = statusFlow.indexOf(currentStatus);

  const handleUpdateStatus = async () => {
    if (selectedStatus && order) {
      await onUpdateStatus(order.id, selectedStatus);
      setSelectedStatus(null);
      onOpenChange(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            {order.order_number}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            Modifier le statut de la commande
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Status */}
          <div className="p-4 rounded-lg bg-cream/5 border border-gold/20">
            <p className="text-cream/60 text-sm mb-2">Statut actuel</p>
            <Badge className={`${statusConfig[currentStatus].color} border text-sm`}>
              {(() => {
                const StatusIcon = statusConfig[currentStatus].icon;
                return <StatusIcon className="h-4 w-4 mr-2" />;
              })()}
              {statusConfig[currentStatus].label}
            </Badge>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-cream/5">
              <p className="text-cream/60 mb-1">Client</p>
              <p className="text-cream font-medium">{order.shipping_full_name || "—"}</p>
              <p className="text-cream/60">{order.shipping_phone}</p>
              {order.guest_email && (
                <p className="text-cream/60">{order.guest_email}</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-cream/5">
              <p className="text-cream/60 mb-1">Livraison</p>
              <p className="text-cream">{order.shipping_city}</p>
              <p className="text-cream/60">{order.shipping_neighborhood}</p>
              <p className="text-cream/60">{order.shipping_street}</p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-cream/60 text-sm">Articles ({order.items.length})</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-cream/5">
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm truncate">{item.product_name}</p>
                    <p className="text-cream/50 text-xs">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <p className="text-cream font-medium text-sm">{formatPrice(item.total_price)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2 border-t border-gold/20">
              <span className="text-cream/60">Total</span>
              <span className="text-primary font-bold">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Status History */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-cream hover:bg-cream/10 border border-gold/20"
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique des changements
                </span>
                <motion.span
                  animate={{ rotate: historyOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <OrderStatusHistory orderId={order.id} />
            </CollapsibleContent>
          </Collapsible>

          {/* Status Selection */}
          <div className="space-y-3">
            <p className="text-cream font-medium">Changer le statut</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(statusConfig).map(([status, config]) => {
                const StatusIcon = config.icon;
                const isSelected = selectedStatus === status;
                const isCurrent = currentStatus === status;
                
                return (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStatus(status as OrderStatus)}
                    disabled={isCurrent}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${isSelected 
                        ? "border-primary bg-primary/10" 
                        : isCurrent 
                          ? "border-gold/30 bg-cream/5 opacity-50 cursor-not-allowed" 
                          : "border-gold/20 bg-cream/5 hover:border-gold/40"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-cream/60"}`} />
                      <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-cream"}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-cream/50 line-clamp-2">
                      {config.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gold/20">
            <Button
              variant="outline"
              className="flex-1 border-gold/30 text-cream hover:bg-cream/10"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
              onClick={handleUpdateStatus}
              disabled={!selectedStatus || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Confirmer le changement"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
