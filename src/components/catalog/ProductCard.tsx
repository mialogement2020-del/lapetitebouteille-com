import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Sparkles, Share2, Check, QrCode, Download, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

const PUBLISHED_URL = "https://cameroon-spirits-ai.lovable.app";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const productQrUrl = `${PUBLISHED_URL}/produit/${product.slug}`;

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
        toast.success("QR code téléchargé !");
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(productQrUrl);
      setQrCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setQrCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Découvrez ${product.name}`,
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
          text: product.short_description || `Découvrez ${product.name}`,
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
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
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
      <Link to={`/produit/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-noir to-noir/80">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-gradient-gold text-noir font-semibold shadow-gold">
              <Sparkles className="h-3 w-3 mr-1" />
              Nouveau
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
              Rupture de stock
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
            to={`/catalogue?category=${product.category.slug}`}
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
              ({product.review_count} avis)
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
              <span className="text-xs text-cream/50">FCFA</span>
            </div>
            {product.original_price && (
              <span className="text-sm text-cream/40 line-through">
                {formatPrice(product.original_price)} FCFA
              </span>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              boxShadow: [
                "0 0 0 0 rgba(212, 175, 55, 0.4)",
                "0 0 0 8px rgba(212, 175, 55, 0)",
              ]
            }}
            transition={{
              boxShadow: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }
            }}
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

        {/* Action Buttons - Always visible at bottom */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-cream/10">
          <WishlistButton 
            productId={product.id} 
            className="flex-1 h-9 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 h-9 gap-1.5 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copié" : "Partager"}
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
                  QR Code
                </DialogTitle>
              </DialogHeader>
              <p id={`qr-desc-${product.id}`} className="sr-only">
                Scannez ce QR code pour accéder au produit.
              </p>
              <div className="flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG
                    id={`qr-code-${product.id}`}
                    value={productQrUrl}
                    size={160}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#1a1a1a"
                  />
                </div>
                <p className="text-cream/70 text-center text-xs font-medium line-clamp-2">
                  {product.name}
                </p>
                
                {/* Link Display */}
                <div className="w-full bg-noir/50 rounded-lg p-2">
                  <p className="text-[10px] text-cream/50 mb-0.5">Lien :</p>
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
                    {qrCopied ? "Copié" : "Copier"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 gap-1.5 border-cream/20 text-cream hover:bg-cream/5 text-xs"
                    onClick={handleShareQR}
                  >
                    <Share2 className="h-3 w-3" />
                    Partager
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 gap-1.5 bg-gradient-gold text-noir font-semibold hover:opacity-90 text-xs"
                    onClick={handleDownloadQR}
                  >
                    <Download className="h-3 w-3" />
                    PNG
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
