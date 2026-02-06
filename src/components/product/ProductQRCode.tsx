import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProductReferral } from "@/hooks/useProductReferral";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProductQRCodeProps {
  productSlug: string;
  productName: string;
}

export function ProductQRCode({ productSlug, productName }: ProductQRCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrLink, setQrLink] = useState<string>("");
  const { user } = useAuthContext();
  const { generateProductReferralLink, getUserReferralCode } = useProductReferral();

  useEffect(() => {
    if (isOpen) {
      const generateLink = async () => {
        if (user) {
          const link = await generateProductReferralLink(productSlug);
          setQrLink(link);
        } else {
          setQrLink(`${window.location.origin}/produit/${productSlug}`);
        }
      };
      generateLink();
    }
  }, [isOpen, user, productSlug, generateProductReferralLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrLink);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("product-qr-code");
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
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement("a");
        link.download = `qr-${productSlug}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR code téléchargé !");
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="border-cream/20 text-cream hover:bg-cream/5 rounded-full"
          title="Afficher le QR code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-noir-light border-gold/20 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-cream font-display text-xl">
            QR Code de partage
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {qrLink && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center space-y-4"
            >
              {/* QR Code Container */}
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG
                  id="product-qr-code"
                  value={qrLink}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              </div>

              {/* Product Name */}
              <p className="text-cream/80 text-center text-sm font-medium">
                {productName}
              </p>

              {/* Referral Badge */}
              {user && qrLink.includes("?ref=") && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5">
                  <span className="text-xs text-primary font-medium">
                    ✨ Lien de parrainage inclus
                  </span>
                </div>
              )}

              {/* Link Display */}
              <div className="w-full bg-noir/50 rounded-lg p-3">
                <p className="text-xs text-cream/50 mb-1">Lien du produit :</p>
                <p className="text-xs text-cream font-mono break-all">
                  {qrLink}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 border-cream/20 text-cream hover:bg-cream/5"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copier
                </Button>
                <Button
                  className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
                  onClick={handleDownloadQR}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>

              {/* Info */}
              <p className="text-xs text-cream/40 text-center">
                Scannez ce QR code pour accéder directement au produit
                {user && qrLink.includes("?ref=") && (
                  <span className="block mt-1 text-primary/70">
                    Vos commissions seront automatiquement créditées !
                  </span>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
