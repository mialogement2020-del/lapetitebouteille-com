import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Gift, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartContext } from "@/contexts/CartContext";
import { useProductReferral } from "@/hooks/useProductReferral";

interface CartDrawerProps {
  children?: React.ReactNode;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export function CartDrawer({ children }: CartDrawerProps) {
  const { items, isLoading, updateQuantity, removeItem, subtotal, itemCount } = useCartContext();
  const { hasStoredReferral, getStoredReferralCode } = useProductReferral();

  const hasActiveReferral = hasStoredReferral();
  const referralCode = hasActiveReferral ? getStoredReferralCode() : null;

  const deliveryFee = subtotal >= 50000 ? 0 : 2000;
  const total = subtotal + deliveryFee;

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="text-cream hover:text-primary hover:bg-cream/10 relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-noir text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg bg-noir border-l border-gold/20 p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-gold/20">
          <SheetTitle className="font-display text-2xl text-cream flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Mon Panier
            {itemCount > 0 && (
              <span className="text-sm font-normal text-cream/60">
                ({itemCount} article{itemCount > 1 ? "s" : ""})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-cream/5 flex items-center justify-center mb-6">
              <ShoppingBag className="h-12 w-12 text-cream/30" />
            </div>
            <h3 className="font-display text-xl text-cream mb-2">
              Votre panier est vide
            </h3>
            <p className="text-cream/60 mb-6">
              Découvrez notre sélection de vins et spiritueux d'exception.
            </p>
            <SheetClose asChild>
              <Link to="/catalogue">
                <Button className="bg-gradient-gold text-noir font-semibold gap-2">
                  Explorer le catalogue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-6">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="flex gap-4 mb-4 pb-4 border-b border-gold/10 last:border-0"
                  >
                    {/* Product Image */}
                    <Link to={`/produit/${item.product?.slug}`} className="flex-shrink-0">
                      <img
                        src={item.product?.image_url || "/placeholder.svg"}
                        alt={item.product?.name}
                        className="w-20 h-24 object-cover rounded-lg"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/produit/${item.product?.slug}`}>
                        <h4 className="font-medium text-cream line-clamp-2 hover:text-primary transition-colors">
                          {item.product?.name}
                        </h4>
                      </Link>
                      
                      <p className="text-primary font-semibold mt-1">
                        {formatPrice(item.product?.price || 0)} FCFA
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 bg-cream/5 rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-cream hover:text-primary hover:bg-cream/10"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-cream text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-cream hover:text-primary hover:bg-cream/10"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= (item.product?.stock_quantity || 99)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-cream/50 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 border-t border-gold/20 space-y-4">
              {/* Referral Indicator */}
              {hasActiveReferral && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg p-3"
                >
                  <Gift className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cream">
                      Parrainage actif
                    </p>
                    <p className="text-xs text-cream/60 truncate">
                      Code <span className="font-mono text-primary">{referralCode}</span> sera appliqué automatiquement
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                    👥
                  </Badge>
                </motion.div>
              )}

              {/* Subtotals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-cream/70">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)} FCFA</span>
                </div>
                <div className="flex justify-between text-cream/70">
                  <span>Livraison</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-primary">Gratuite</span>
                    ) : (
                      `${formatPrice(deliveryFee)} FCFA`
                    )}
                  </span>
                </div>
                {subtotal < 50000 && (
                  <p className="text-xs text-primary">
                    Plus que {formatPrice(50000 - subtotal)} FCFA pour la livraison gratuite !
                  </p>
                )}
              </div>

              <Separator className="bg-gold/20" />

              {/* Total */}
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-semibold text-cream">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(total)} FCFA
                </span>
              </div>

              {/* Checkout Button */}
              <SheetClose asChild>
                <Link to="/checkout" className="block">
                  <Button className="w-full bg-gradient-gold text-noir font-semibold h-12 gap-2">
                    Passer la commande
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </SheetClose>

              {/* Continue Shopping */}
              <SheetClose asChild>
                <Link to="/catalogue" className="block">
                  <Button variant="outline" className="w-full border-gold/30 text-cream hover:bg-cream/10">
                    Continuer mes achats
                  </Button>
                </Link>
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
