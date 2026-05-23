import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, Check } from "lucide-react";
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
import logoIcon from "@/assets/logo-icon.png";
import { useTranslation } from "react-i18next";

interface ProductQRCodeProps {
  productSlug: string;
  productName: string;
}

export function ProductQRCode({ productSlug, productName }: ProductQRCodeProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrLink, setQrLink] = useState<string>("");
  const { user } = useAuthContext();
  const { generateProductReferralLink, getUserReferralCode } = useProductReferral();

  const baseUrl = "https://lapetitebouteille.com";

  useEffect(() => {
    if (isOpen) {
      const generateLink = async () => {
        if (user) {
          const code = await getUserReferralCode();
          setQrLink(`${baseUrl}/produit/${productSlug}?ref=${code}`);
        } else {
          setQrLink(`${baseUrl}/produit/${productSlug}`);
        }
      };
      generateLink();
    }
  }, [isOpen, user, productSlug, getUserReferralCode]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrLink);
      setCopied(true);
      toast.success(t("qr.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("qr.copyError"));
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
        toast.success(t("qr.downloaded"));
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
          className="border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full"
          title={t("qr.show")}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-noir-light border-gold/20 max-w-sm" aria-describedby="qr-description">
        <DialogHeader>
          <DialogTitle className="text-cream font-display text-xl">
            {t("qr.title")}
          </DialogTitle>
        </DialogHeader>
        <p id="qr-description" className="sr-only">
          {t("qr.desc")}
        </p>

        {qrLink && (
          <div className="flex flex-col items-center space-y-4">
            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-xl relative">
              <QRCodeSVG
                id="product-qr-code"
                value={qrLink}
                size={200}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#1a1a1a"
              />
              {/* Logo au centre du QR code */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1.5 rounded-lg">
                  <img 
                    src={logoIcon} 
                    alt="La Petite Bouteille" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
              </div>
            </div>

              {/* Product Name */}
              <p className="text-cream/80 text-center text-sm font-medium">
                {productName}
              </p>

              {/* Referral Badge */}
              {user && qrLink.includes("?ref=") && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5">
                  <span className="text-xs text-primary font-medium">
                    {t("qr.referralIncluded")}
                  </span>
                </div>
              )}

              {/* Link Display */}
              <div className="w-full bg-noir/50 rounded-lg p-3">
                <p className="text-xs text-cream/50 mb-1">{t("qr.linkLabel")}</p>
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
                  {t("qr.copy")}
                </Button>
                <Button
                  className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
                  onClick={handleDownloadQR}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("qr.download")}
                </Button>
              </div>

              {/* Info */}
              <p className="text-xs text-cream/40 text-center">
                {t("qr.info")}
                {user && qrLink.includes("?ref=") && (
                  <span className="block mt-1 text-primary/70">
                    {t("qr.infoReferral")}
                  </span>
                )}
              </p>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}
