import { motion } from "framer-motion";
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { OrderWithItems } from "@/hooks/useProfile";

interface OrderHistoryProps {
  orders: OrderWithItems[];
  loading: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock },
  confirmed: { label: "Confirmée", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: CheckCircle },
  processing: { label: "En préparation", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: Package },
  shipped: { label: "Expédiée", color: "bg-indigo-500/20 text-indigo-500 border-indigo-500/30", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle },
  cancelled: { label: "Annulée", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: XCircle },
};

export function OrderHistory({ orders, loading }: OrderHistoryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-cream/10" />
          <Skeleton className="h-4 w-64 bg-cream/10" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full bg-cream/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Historique des commandes
          </CardTitle>
          <CardDescription className="text-cream/60">
            Suivez vos commandes et consultez leur historique
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-cream/20 mb-4" />
              <p className="text-cream/60 text-lg mb-2">Aucune commande</p>
              <p className="text-cream/40 text-sm mb-6">
                Vous n'avez pas encore passé de commande
              </p>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => window.location.href = "/catalogue"}
              >
                Découvrir le catalogue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {orders.map((order, index) => {
                const status = statusConfig[order.status || "pending"];
                const StatusIcon = status.icon;

                return (
                  <AccordionItem
                    key={order.id}
                    value={order.id}
                    className="border border-gold/20 rounded-lg overflow-hidden bg-cream/5"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-cream/5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left w-full">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-cream font-medium">
                              {order.order_number}
                            </p>
                            <p className="text-cream/50 text-xs">
                              {formatDate(order.created_at || "")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:ml-auto">
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="text-primary font-semibold">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        {/* Order Items */}
                        <div className="space-y-2">
                          <p className="text-cream/60 text-sm font-medium">Articles</p>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-cream/5"
                              >
                                {item.product_image && (
                                  <img
                                    src={item.product_image}
                                    alt={item.product_name}
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-cream text-sm truncate">
                                    {item.product_name}
                                  </p>
                                  <p className="text-cream/50 text-xs">
                                    Qté: {item.quantity} × {formatPrice(item.unit_price)}
                                  </p>
                                </div>
                                <p className="text-cream font-medium text-sm">
                                  {formatPrice(item.total_price)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Info */}
                        {order.shipping_full_name && (
                          <div className="space-y-2">
                            <p className="text-cream/60 text-sm font-medium">Livraison</p>
                            <div className="p-3 rounded-lg bg-cream/5 text-sm">
                              <p className="text-cream">{order.shipping_full_name}</p>
                              <p className="text-cream/60">{order.shipping_street}</p>
                              <p className="text-cream/60">
                                {order.shipping_neighborhood}, {order.shipping_city}
                              </p>
                              <p className="text-cream/60">{order.shipping_phone}</p>
                            </div>
                          </div>
                        )}

                        {/* Order Summary */}
                        <div className="border-t border-gold/20 pt-3 space-y-1 text-sm">
                          <div className="flex justify-between text-cream/60">
                            <span>Sous-total</span>
                            <span>{formatPrice(order.subtotal)}</span>
                          </div>
                          {order.delivery_fee && order.delivery_fee > 0 && (
                            <div className="flex justify-between text-cream/60">
                              <span>Livraison</span>
                              <span>{formatPrice(order.delivery_fee)}</span>
                            </div>
                          )}
                          {order.discount_amount && order.discount_amount > 0 && (
                            <div className="flex justify-between text-green-500">
                              <span>Réduction</span>
                              <span>-{formatPrice(order.discount_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-cream font-semibold text-base pt-2 border-t border-gold/10">
                            <span>Total</span>
                            <span className="text-primary">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
