import { useState } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Download,
  Filter,
  MessageCircle,
  Facebook,
  Instagram,
  Globe,
  Loader2,
} from "lucide-react";
import { useShareableAssets, useTrackAssetDownload, downloadAsset, ShareableAsset } from "@/hooks/useShareableAssets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

const platformIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  all: <Globe className="h-4 w-4" />,
};

function AssetCard({
  asset,
  onDownload,
  isDownloading,
}: {
  asset: ShareableAsset;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  const { t } = useTranslation("shareableAssets");

  const assetTypeLabels: Record<string, string> = {
    banner: t("type.banner"),
    story: t("type.story"),
    post: t("type.post"),
    flyer: t("type.flyer"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group rounded-xl border border-gold/10 overflow-hidden bg-noir-light/30 hover:border-gold/30 transition-colors"
    >
      {/* Preview */}
      <div className="aspect-[4/3] relative overflow-hidden bg-noir">
        <img
          src={asset.thumbnail_url || asset.image_url}
          alt={asset.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            onClick={onDownload}
            disabled={isDownloading}
            className="bg-primary hover:bg-primary/90 text-noir"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t("download")}
          </Button>
        </div>

        {/* Type badge */}
        <Badge className="absolute top-2 left-2 bg-noir/70 text-cream border-0 text-xs">
          {assetTypeLabels[asset.asset_type] || asset.asset_type}
        </Badge>

        {/* Platform badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-7 h-7 rounded-full bg-noir/70 flex items-center justify-center text-cream">
            {platformIcons[asset.platform]}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="text-cream font-medium line-clamp-1">{asset.title}</h4>
        {asset.description && (
          <p className="text-sm text-cream/60 line-clamp-2 mt-1">
            {asset.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-cream/40">
            {t("downloadCount", { count: asset.download_count })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading}
            className="text-primary hover:text-primary/80"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function ShareableAssetsLibrary() {
  const { t } = useTranslation("shareableAssets");
  const [filters, setFilters] = useState<{
    assetType: string;
    platform: string;
  }>({
    assetType: "all",
    platform: "all",
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: assets, isLoading } = useShareableAssets(filters);
  const trackDownload = useTrackAssetDownload();

  const handleDownload = async (asset: ShareableAsset) => {
    setDownloadingId(asset.id);
    await downloadAsset(asset, (id) => trackDownload.mutate(id));
    setDownloadingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-noir" />
          </div>
          <div>
            <h3 className="font-display text-xl text-cream">{t("title")}</h3>
            <p className="text-sm text-cream/60">{t("subtitle")}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select
            value={filters.assetType}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, assetType: value }))
            }
          >
            <SelectTrigger className="w-32 bg-noir-light/50 border-gold/20 text-cream">
              <SelectValue placeholder={t("typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.type.all")}</SelectItem>
              <SelectItem value="banner">{t("filter.type.banner")}</SelectItem>
              <SelectItem value="story">{t("filter.type.story")}</SelectItem>
              <SelectItem value="post">{t("filter.type.post")}</SelectItem>
              <SelectItem value="flyer">{t("filter.type.flyer")}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.platform}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, platform: value }))
            }
          >
            <SelectTrigger className="w-36 bg-noir-light/50 border-gold/20 text-cream">
              <SelectValue placeholder={t("platformPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.platform.all")}</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-noir-light/50 animate-pulse" />
          ))}
        </div>
      ) : !assets?.length ? (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-cream/20 mx-auto mb-4" />
          <p className="text-cream/60">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDownload={() => handleDownload(asset)}
              isDownloading={downloadingId === asset.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
