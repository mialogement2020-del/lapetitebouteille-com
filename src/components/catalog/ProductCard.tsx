import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Sparkles, Share2, Check, QrCode, Download, Copy, Package, TrendingUp, Coins } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { ComparatorButton } from "@/components/product/ComparatorButton";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import { WHOLESALE_TIERS } from "@/hooks/useWholesale";
import { useWholesaleTierConfig } from "@/hooks/useWholesaleTierConfig";
import { usePricingConfig, computeProductPricing } from "@/hooks/usePricingConfig";
import { useUserRoles } from "@/hooks/useUserRoles";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import logoIcon from "@/assets/logo-icon.png";

const PUBLISHED_URL = "https://lapetitebouteille.com";
const FALLBACK_IMAGE = "/placeholder.svg";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const { data: tierConfig } = useWholesaleTierConfig();
  const { data: pricingConfig } = usePricingConfig();
  const { isAdmin, isAmbassador } = useUserRoles();
  const canSeeBreakdown = isAdmin || isAmbassador;
  const breakdown = canSeeBreakdown
    ? computeProductPricing(product, pricingConfig)
    : null;

  const productQrUrl = `${PUBLISHED_URL}/produit/${product.slug}`;
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.src.endsWith(FALLBACK_IMAGE)) return;
    image.src = FALLBACK_IMAGE;
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById(`qr-code-${product.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement("a");
        link.download = `qr-${product.slug}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success(t("productCard.qrDownloaded"));
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(productQrUrl);
      setQrCopied(true);
      toast.success(t("productCard.linkCopied"));
      setTimeout(() => setQrCopied(false), 2000);
    } catch {
      toast.error(t("productCard.linkCopyError"));
    }
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: t("productShare.discoverText", { name: product.name }),
          url: productQrUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          handleCopyQrLink();
        }
      }
    } else {
      handleCopyQrLink();
    }
  };
  
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isNew =
    new Date(product.created_at) >
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const handleShare = async () => {
    const url = `${window.location.origin}/produit/${product.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || t("productShare.discoverText", { name: product.name }),
          url: url,
        });
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("productCard.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("productCard.linkCopyError"));
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group relative bg-cream/[0.03] rounded-2xl border border-cream/10 overflow-hidden hover:border-primary/30 hover:shadow-luxury transition-all duration-500 flex flex-col"
    >
      {/* Image Container */}
      <Link to={`/produit/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-muted/20 to-muted/40">
        <img
          src={optimizeProductImage(product.image_url, { width: 420, height: 560 })}
          alt={product.name}
          className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 4 ? "high" : "auto"}
          onError={handleImageError}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-gradient-gold text-noir font-semibold shadow-gold">
              <Sparkles className="h-3 w-3 mr-1" />
              {t("productCard.newBadge")}
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-secondary text-cream font-semibold">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Stock Status */}
        {product.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-noir/70 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-cream text-noir px-4 py-2 rounded-full font-semibold text-sm">
              {t("productCard.outOfStock")}
            </span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-noir/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category */}
        {product.category && (
          <Link
            to={`/catalogue/${product.category.slug}`}
            className="text-xs text-primary uppercase tracking-widest hover:underline font-medium"
          >
            {product.category.name}
          </Link>
        )}

        {/* Name */}
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-display text-lg font-semibold mt-2 line-clamp-2 text-cream group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-sm font-medium text-cream">{product.average_rating.toFixed(1)}</span>
            <span className="text-sm text-cream/50">
              {t("productCard.reviewsCount", { count: product.review_count })}
            </span>
          </div>
        )}

        {/* Price & Cart */}
        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gradient-gold font-display">
                {formatPrice(product.price)}
              </span>
            </div>
            {product.original_price && (
              <span className="text-sm text-cream/40 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-full"
          >
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              iconOnly
              className="h-11 w-11 rounded-full bg-gradient-gold hover:brightness-110 text-noir shadow-gold shine-effect"
              disabled={product.stock_quantity <= 0}
            />
          </motion.div>
        </div>

        {/* Origin & Volume */}
        <div className="flex items-center gap-3 mt-4 text-xs text-cream/40">
          {product.origin_country && <span>{product.origin_country}</span>}
          {product.volume_ml && <span>{product.volume_ml}ml</span>}
          {product.alcohol_percentage && <span>{product.alcohol_percentage}%</span>}
        </div>

        {/* Pricing breakdown — Admin & Ambassadeurs uniquement */}
        {breakdown && pricingConfig && (
          <div className="mt-3 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <TrendingUp className="h-3 w-3" />
                {isAdmin ? "Répartition" : "Vos gains estimés"}
              </div>
              {breakdown.hasPurchase && (
                <span className="text-[10px] text-cream/50">
                  vente conseillée {formatPrice(breakdown.targetSalePrice)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center gap-1 rounded-md bg-green-500/10 border border-green-500/30 px-2 py-1">
                <Coins className="h-3 w-3 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-cream/50 text-[9px] uppercase leading-none">
                    Ambassadeur
                  </p>
                  <p className="text-green-400 font-semibold truncate">
                    {formatPrice(breakdown.ambassadorEarning)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-primary/10 border border-primary/30 px-2 py-1">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-cream/50 text-[9px] uppercase leading-none">
                    Points
                  </p>
                  <p className="text-primary font-semibold truncate">
                    {breakdown.points} pts
                  </p>
                </div>
              </div>
              {isAdmin && breakdown.hasPurchase && (
                <>
                  <div className="rounded-md bg-cream/5 border border-gold/10 px-2 py-1">
                    <p className="text-cream/50 text-[9px] uppercase leading-none">
                      Marge ({breakdown.markupPercent}%)
                    </p>
                    <p className="text-cream font-semibold truncate">
                      {formatPrice(breakdown.margin)}
                    </p>
                  </div>
                  <div className="rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-1">
                    <p className="text-cream/50 text-[9px] uppercase leading-none">
                      Plateforme
                    </p>
                    <p className="text-blue-400 font-semibold truncate">
                      {formatPrice(breakdown.platformEarning)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Wholesale CTA */}
        {(() => {
          if (tierConfig && tierConfig.enabled === false) return null;
          const enabledCardTiers = WHOLESALE_TIERS.filter(t => tierConfig?.card_tiers?.includes(t.type));
          if (enabledCardTiers.length === 0) return null;
          const overrides = (tierConfig?.discount_overrides || {}) as Record<string, number>;
          const maxDiscount = Math.max(
            ...enabledCardTiers.map((t) => overrides[t.type] ?? t.discountPercent)
          );
          return (
            <Link
              to={`/produit/${product.slug}#wholesale`}
              className="mt-3 flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/60 hover:from-primary/30 hover:to-primary/20 transition-all group/wholesale"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary tracking-wide">{t("productCard.wholesaleCta")}</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] px-2 py-0.5 h-5 group-hover/wholesale:bg-green-500/30 transition-colors">
                {t("productCard.wholesaleDiscount", { percent: maxDiscount })}
              </Badge>
            </Link>
          );
        })()}

        {/* Action Buttons - Always visible at bottom */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-cream/10">
          <WishlistButton 
            productId={product.id} 
            className="h-9 w-9 p-0 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full"
          />
          <ComparatorButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              original_price: product.original_price,
              image_url: product.image_url,
              alcohol_percentage: product.alcohol_percentage,
              volume_ml: product.volume_ml,
              origin_country: product.origin_country,
              region: product.region,
              grape_variety: product.grape_variety,
              tasting_notes: product.tasting_notes,
              average_rating: product.average_rating,
              review_count: product.review_count,
            }}
            variant="icon"
            className="h-9 w-9 p-0 rounded-full"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 h-9 gap-1.5 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? t("productCard.copied") : t("productCard.share")}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full"
                title="QR Code"
              >
                <QrCode className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-noir-light border-gold/20 max-w-xs" aria-describedby={`qr-desc-${product.id}`}>
              <DialogHeader>
                <DialogTitle className="text-cream font-display text-lg">
                {t("productCard.qrTitle")}
                </DialogTitle>
              </DialogHeader>
              <p id={`qr-desc-${product.id}`} className="sr-only">
              {t("productCard.qrDesc")}
              </p>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-xl relative">
                  <QRCodeSVG
                    id={`qr-code-${product.id}`}
                    value={productQrUrl}
                    size={160}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                  />
                  {/* Logo au centre du QR code */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-md">
                      <img 
                        src={logoIcon} 
                        alt="La Petite Bouteille" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-cream/70 text-center text-xs font-medium line-clamp-2">
                  {product.name}
                </p>
                
                {/* Link Display */}
                <div className="w-full bg-noir/50 rounded-lg p-2">
                  <p className="text-[10px] text-cream/50 mb-0.5">{t("productCard.qrLink")}</p>
                  <p className="text-[10px] text-cream font-mono break-all line-clamp-2">
                    {productQrUrl}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 gap-1.5 border-cream/20 text-cream hover:bg-cream/5 text-xs"
                    onClick={handleCopyQrLink}
                  >
                    {qrCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {qrCopied ? t("productCard.copied") : t("productCard.copy")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 gap-1.5 border-cream/20 text-cream hover:bg-cream/5 text-xs"
                    onClick={handleShareQR}
                  >
                    <Share2 className="h-3 w-3" />
                    {t("productCard.share")}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 gap-1.5 bg-gradient-gold text-noir font-semibold hover:opacity-90 text-xs"
                    onClick={handleDownloadQR}
                  >
                    <Download className="h-3 w-3" />
                    {t("productCard.download")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.article>
  );
};
