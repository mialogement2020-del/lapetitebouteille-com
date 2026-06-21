import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Share2, Link2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ReferralLinkProps {
  code: string;
  customCode?: string | null;
  stats: {
    total_clicks: number;
    total_signups: number;
    total_orders: number;
  };
}

export function ReferralLink({ code, customCode, stats }: ReferralLinkProps) {
  const { t } = useTranslation("referralLink");
  const [copied, setCopied] = useState(false);

  const referralCode = customCode || code;
  const referralLink = `${window.location.origin}/inscription?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: t("toast.copied"),
        description: t("toast.copiedDesc"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("toast.copyError"),
        description: t("toast.copyErrorDesc"),
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareTitle"),
          text: t("shareText"),
          url: referralLink,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-gradient-to-br from-noir-light to-noir border border-gold/20 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-cream font-display text-lg">{t("title")}</h3>
          <p className="text-cream/60 text-sm">{t("subtitle")}</p>
        </div>
      </div>

      {/* Referral Code Display */}
      <div className="mb-6">
        <p className="text-cream/60 text-sm mb-2">{t("yourCode")}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30">
            <span className="font-mono text-primary text-xl font-bold tracking-wider">
              {referralCode}
            </span>
          </div>
        </div>
      </div>

      {/* Link Input */}
      <div className="mb-6">
        <p className="text-cream/60 text-sm mb-2">{t("fullLink")}</p>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="bg-cream/5 border-gold/20 text-cream text-sm"
          />
          <Button
            onClick={handleCopy}
            variant="outline"
            className="border-gold/30 text-cream hover:bg-cream/10 flex-shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        className="w-full bg-gradient-gold text-noir font-semibold mb-6"
      >
        <Share2 className="h-4 w-4 mr-2" />
        {t("shareBtn")}
      </Button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gold/10">
        <div className="text-center">
          <p className="text-2xl font-display text-cream">{stats.total_clicks}</p>
          <p className="text-cream/50 text-xs">{t("clicks")}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display text-cream">{stats.total_signups}</p>
          <p className="text-cream/50 text-xs">{t("signups")}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display text-cream">{stats.total_orders}</p>
          <p className="text-cream/50 text-xs">{t("orders")}</p>
        </div>
      </div>
    </motion.div>
  );
}
