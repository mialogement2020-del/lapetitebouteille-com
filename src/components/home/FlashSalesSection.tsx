import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Clock, ArrowRight } from "lucide-react";
import { useActiveFlashSales, useFlashSaleProducts } from "@/hooks/useFlashSales";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { useTranslation } from "react-i18next";

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endsAt).getTime() - Date.now();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24) + Math.floor(difference / (1000 * 60 * 60 * 24)) * 24,
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  const padZero = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1 font-mono text-lg">
      <div className="bg-destructive/90 text-white px-2 py-1 rounded">
        {padZero(timeLeft.hours)}
      </div>
      <span className="text-destructive font-bold">:</span>
      <div className="bg-destructive/90 text-white px-2 py-1 rounded">
        {padZero(timeLeft.minutes)}
      </div>
      <span className="text-destructive font-bold">:</span>
      <div className="bg-destructive/90 text-white px-2 py-1 rounded">
        {padZero(timeLeft.seconds)}
      </div>
    </div>
  );
}

export function FlashSalesSection() {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const { data: flashSales, isLoading } = useActiveFlashSales();
  const activeFlashSale = flashSales?.[0];
  const { data: products } = useFlashSaleProducts(activeFlashSale?.id);

  if (isLoading || !activeFlashSale || !products?.length) return null;

  return (
    <section className="py-12 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 via-primary/5 to-destructive/10 animate-pulse" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center animate-pulse">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="font-display text-3xl text-cream">
                {activeFlashSale.name}
              </h2>
              <p className="text-cream/60">{activeFlashSale.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-cream/80">
              <Clock className="h-5 w-5 text-destructive" />
              <span className="text-sm">{t("flashSales.endsIn")}</span>
            </div>
            <CountdownTimer endsAt={activeFlashSale.ends_at} />
          </div>
        </motion.div>

        {/* Products grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {products.slice(0, 4).map((item, index) => {
            const savings = item.product?.price
              ? item.product.price - item.flash_price
              : 0;
            const percentOff = item.product?.price
              ? Math.round((savings / item.product.price) * 100)
              : activeFlashSale.discount_percentage;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/produit/${item.product?.slug || item.product_id}`}
                  className="group block relative"
                >
                  {/* Discount badge */}
                  <Badge className="absolute top-2 left-2 z-10 bg-destructive text-white border-0 text-sm font-bold">
                    -{percentOff}%
                  </Badge>

                  {/* Image */}
                  <div className="aspect-square rounded-xl overflow-hidden bg-noir-light/50 border-2 border-destructive/30 group-hover:border-destructive/60 transition-colors">
                    {item.product?.image_url ? (
                      <img
                        src={optimizeProductImage(item.product.image_url, { width: 360, height: 360 })}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cream/30">
                        <Zap className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-3 space-y-1">
                    <h3 className="text-cream font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {item.product?.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive font-bold text-lg">
                        {formatPrice(item.flash_price)}
                      </span>
                      <span className="text-cream/40 line-through text-sm">
                        {item.product?.price && formatPrice(item.product.price)}
                      </span>
                    </div>
                    <p className="text-xs text-success">
                      {t("flashSales.savings", { amount: formatPrice(savings) })}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* View all button */}
        {products.length > 4 && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {t("flashSales.viewAll")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
