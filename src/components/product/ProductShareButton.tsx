import { useState } from "react";
import { Share2, Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProductReferral } from "@/hooks/useProductReferral";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProductShareButtonProps {
  productSlug: string;
  productName: string;
  shortDescription?: string;
}

export function ProductShareButton({
  productSlug,
  productName,
  shortDescription,
}: ProductShareButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const { user } = useAuthContext();
  const { generateProductReferralLink, getUserReferralCode } = useProductReferral();

  const handleOpen = async (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
      const link = await generateProductReferralLink(productSlug);
      setReferralLink(link);
    }
  };

  const handleShare = async (includeReferral: boolean = false) => {
    let shareUrl = `${window.location.origin}/produit/${productSlug}`;
    
    if (includeReferral && user) {
      const refCode = await getUserReferralCode();
      if (refCode) {
        shareUrl = `${shareUrl}?ref=${refCode}`;
      }
    }

    const shareData = {
      title: productName,
      text: shortDescription || t("productShare.discoverText", { name: productName }),
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        if (includeReferral) {
          toast.success(t("productShare.sharedReferral"));
        }
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(
        includeReferral 
          ? t("productShare.copiedReferral")
          : t("productShare.copied")
      );
      setTimeout(() => setCopied(false), 2000);
    }
    setIsOpen(false);
  };

  // If user is not logged in, just share without referral
  if (!user) {
    return (
      <Button
        variant="outline"
        className="gap-2 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full"
        onClick={() => handleShare(false)}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {t("productShare.share")}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full"
        >
          <Share2 className="h-4 w-4" />
          {t("productShare.share")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-noir-light border-gold/20 p-4" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-cream">{t("productShare.title")}</h4>
          
          {/* Regular Share */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-cream/20 text-cream hover:bg-cream/5"
            onClick={() => handleShare(false)}
          >
            <Share2 className="h-4 w-4" />
            {t("productShare.shareLink")}
          </Button>

          {/* Referral Share - highlighted */}
          <Button
            className="w-full justify-start gap-3 bg-gradient-gold text-noir font-semibold hover:opacity-90"
            onClick={() => handleShare(true)}
          >
            <Gift className="h-4 w-4" />
            {t("productShare.shareReferral")}
          </Button>

          <p className="text-xs text-cream/50 mt-2">
            {t("productShare.hint")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
