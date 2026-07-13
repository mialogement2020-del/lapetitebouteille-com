import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Wine, Loader2, Image as ImageIcon, Upload, X, Plus, GripVertical, Calculator, Package, AlertCircle, Trash2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AdminProduct, ProductFormData } from "@/hooks/useAdmin";
import {
  usePricingConfig,
  computePricingBreakdown,
  computePointsForPrice,
  type PointsTier,
} from "@/hooks/usePricingConfig";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import {
  useAdminProductPackagingOptions,
  type ProductPackagingFormOption,
} from "@/hooks/useProductPackagingOptions";
import { calculatePackagingLineTotal, calculatePackagingUnitPrice } from "@/lib/packagingPricing";

interface ProductFormDialogProps {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  onSave: (data: ProductFormData, id?: string) => Promise<void>;
  isSaving: boolean;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const emptyPackagingOption = (
  type: ProductPackagingFormOption["packaging_type"],
  quantity: number,
  label: string,
): ProductPackagingFormOption => ({
  packaging_type: type,
  packaging_label: label,
  bottle_quantity: quantity,
  pricing_mode: "manual_total",
  total_price: 0,
  discount_percent: null,
  show_discount: true,
  stock_quantity: null,
  sku: null,
  weight_kg: null,
  discount_tiers: [],
  is_active: true,
});

const defaultCartonOption = (quantity: number) =>
  emptyPackagingOption("carton", quantity, `Carton de ${quantity} bouteilles`);

const defaultCaseOption = () => emptyPackagingOption("wooden_case", 6, "Caisse bois de 6 bouteilles");

const uploadImageToStorage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
  
  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, { contentType: file.type, upsert: true });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
  return urlData.publicUrl;
};

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  categories,
  onSave,
  isSaving,
}: ProductFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!product;
  const mainImageRef = useRef<HTMLInputElement>(null);
  const galleryImageRef = useRef<HTMLInputElement>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const { data: pricingConfig } = usePricingConfig();
  const formatPrice = useFormatPrice();
  const { data: savedPackagingOptions = [] } = useAdminProductPackagingOptions(product?.id);
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    price: 0,
    original_price: undefined,
    stock_quantity: 0,
    category_id: undefined,
    image_url: "",
    gallery_urls: [],
    is_active: true,
    is_featured: false,
    alcohol_percentage: undefined,
    volume_ml: undefined,
    vintage_year: undefined,
    origin_country: "",
    region: "",
    grape_variety: "",
    tasting_notes: "",
    food_pairing: "",
    serving_temperature: "",
    purchase_price: null,
    markup_percent_override: null,
      points_override: null,
      points_tiers_override: null,
    available_as_case: false,
    units_per_case: null,
    case_price: null,
    packaging_options: [],
  });

  useEffect(() => {
    if (product) {
      const p = product as unknown as Record<string, unknown>;
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        short_description: product.short_description || "",
        price: product.price,
        original_price: product.original_price || undefined,
        stock_quantity: product.stock_quantity || 0,
        category_id: product.category_id || undefined,
        image_url: product.image_url || "",
        gallery_urls: product.gallery_urls || [],
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
        alcohol_percentage: product.alcohol_percentage || undefined,
        volume_ml: product.volume_ml || undefined,
        vintage_year: product.vintage_year || undefined,
        origin_country: product.origin_country || "",
        region: product.region || "",
        grape_variety: product.grape_variety || "",
        tasting_notes: product.tasting_notes || "",
        food_pairing: product.food_pairing || "",
        serving_temperature: product.serving_temperature || "",
        purchase_price: (p.purchase_price as number | null) ?? null,
        markup_percent_override: (p.markup_percent_override as number | null) ?? null,
        points_override: (p.points_override as number | null) ?? null,
        points_tiers_override: Array.isArray(p.points_tiers_override)
          ? (p.points_tiers_override as { max: number | null; points: number }[])
          : null,
        available_as_case: (p.available_as_case as boolean) ?? false,
        units_per_case: (p.units_per_case as number | null) ?? null,
        case_price: (p.case_price as number | null) ?? null,
        packaging_options: [],
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        short_description: "",
        price: 0,
        original_price: undefined,
        stock_quantity: 0,
        category_id: undefined,
        image_url: "",
        gallery_urls: [],
        is_active: true,
        is_featured: false,
        alcohol_percentage: undefined,
        volume_ml: undefined,
        vintage_year: undefined,
        origin_country: "",
        region: "",
        grape_variety: "",
        tasting_notes: "",
        food_pairing: "",
        serving_temperature: "",
        purchase_price: null,
        markup_percent_override: null,
        points_override: null,
        points_tiers_override: null,
        available_as_case: false,
        units_per_case: null,
        case_price: null,
        packaging_options: [],
      });
    }
  }, [product, open]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      const options = savedPackagingOptions.map((option) => ({
        packaging_type: option.packaging_type,
        packaging_label: option.packaging_label,
        bottle_quantity: option.bottle_quantity,
        pricing_mode: option.pricing_mode,
        total_price: option.total_price,
        discount_percent: option.discount_percent,
        show_discount: option.show_discount,
        stock_quantity: option.stock_quantity,
        sku: option.sku,
        weight_kg: option.weight_kg,
        discount_tiers: option.discount_tiers || [],
        is_active: option.is_active,
      }));
      setWholesaleEnabled(options.length > 0);
      setFormData((prev) => ({ ...prev, packaging_options: options }));
    } else {
      setWholesaleEnabled(false);
    }
  }, [open, product, savedPackagingOptions]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !isEditing || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  };

  const handleMainImageUpload = async (file: File) => {
    setIsUploadingMain(true);
    try {
      const url = await uploadImageToStorage(file);
      setFormData((prev) => ({ ...prev, image_url: url }));
      toast({ title: t("productForm.toastMainUploaded") });
    } catch (err) {
      toast({ title: t("productForm.toastUploadError"), description: err instanceof Error ? err.message : t("productForm.toastUploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingMain(false);
    }
  };

  const handleGalleryImageUpload = async (files: FileList) => {
    setIsUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImageToStorage(file);
        urls.push(url);
      }
      setFormData((prev) => ({ ...prev, gallery_urls: [...(prev.gallery_urls || []), ...urls] }));
      toast({ title: t("productForm.toastGalleryAdded", { count: urls.length }) });
    } catch (err) {
      toast({ title: t("productForm.toastUploadError"), description: err instanceof Error ? err.message : t("productForm.toastUploadFailed"), variant: "destructive" });
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      gallery_urls: (prev.gallery_urls || []).filter((_, i) => i !== index),
    }));
  };

  const setAsMainImage = (galleryUrl: string, index: number) => {
    const oldMain = formData.image_url;
    const newGallery = [...(formData.gallery_urls || [])];
    newGallery.splice(index, 1);
    if (oldMain) newGallery.unshift(oldMain);
    setFormData((prev) => ({ ...prev, image_url: galleryUrl, gallery_urls: newGallery }));
  };

  // Validation
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = "Le nom est requis.";
    if (!formData.price || formData.price <= 0)
      errs.price = "Le prix de vente doit être supérieur à 0.";
    if (
      formData.purchase_price != null &&
      formData.purchase_price < 0
    )
      errs.purchase_price = "Le prix d'achat ne peut pas être négatif.";
    if (wholesaleEnabled) {
      const activePackaging = formData.packaging_options?.filter((option) => option.is_active) || [];
      if (activePackaging.length === 0) {
        errs.packaging_options = "Activez au moins un carton ou une caisse, ou desactivez la vente en gros.";
      }
      activePackaging.forEach((option, index) => {
        if (!option.bottle_quantity || option.bottle_quantity <= 0) {
          errs[`packaging_${index}_quantity`] = "La quantite de bouteilles doit etre superieure a 0.";
        }
        if (!option.total_price || option.total_price <= 0) {
          errs[`packaging_${index}_price`] = "Le prix total du conditionnement est requis.";
        }
        if (option.pricing_mode === "discount_percent" && option.discount_percent == null) {
          errs[`packaging_${index}_discount`] = "Indiquez la remise utilisee pour ce mode de prix.";
        }
      });
    }
    if (
      formData.points_override != null &&
      formData.points_override < 0
    )
      errs.points_override = "Les points ne peuvent pas être négatifs.";
    return errs;
  }, [formData, wholesaleEnabled]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const handleSubmit = async () => {
    if (hasErrors) {
      toast({
        title: "Formulaire incomplet",
        description: Object.values(validationErrors)[0],
        variant: "destructive",
      });
      return;
    }
    await onSave(formData, product?.id);
  };

  const productTiers = (formData.points_tiers_override ?? []) as PointsTier[];
  const updateProductTier = (idx: number, patch: Partial<PointsTier>) => {
    setFormData((prev) => ({
      ...prev,
      points_tiers_override: productTiers.map((t, i) =>
        i === idx ? { ...t, ...patch } : t,
      ),
    }));
  };
  const addProductTier = () =>
    setFormData((prev) => ({
      ...prev,
      points_tiers_override: [...productTiers, { max: null, points: 10 }],
    }));
  const removeProductTier = (idx: number) =>
    setFormData((prev) => ({
      ...prev,
      points_tiers_override: productTiers.filter((_, i) => i !== idx),
    }));

  const packagingOptions = formData.packaging_options || [];
  const setPackagingOptions = (updater: (options: ProductPackagingFormOption[]) => ProductPackagingFormOption[]) => {
    setFormData((prev) => ({ ...prev, packaging_options: updater(prev.packaging_options || []) }));
  };
  const upsertPackagingOption = (option: ProductPackagingFormOption) => {
    setPackagingOptions((options) => {
      const index = options.findIndex(
        (existing) =>
          existing.packaging_type === option.packaging_type &&
          existing.bottle_quantity === option.bottle_quantity,
      );
      if (index === -1) return [...options, option];
      return options.map((existing, idx) => (idx === index ? { ...existing, ...option, is_active: true } : existing));
    });
  };
  const patchPackagingOption = (index: number, patch: Partial<ProductPackagingFormOption>) => {
    setPackagingOptions((options) => options.map((option, idx) => (idx === index ? { ...option, ...patch } : option)));
  };
  const removePackagingOption = (index: number) => {
    setPackagingOptions((options) => options.filter((_, idx) => idx !== index));
  };
  const hasCarton = packagingOptions.some((option) => option.packaging_type === "carton");
  const hasCase = packagingOptions.some((option) => option.packaging_type !== "carton");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-cream flex items-center gap-3">
            <Wine className="h-5 w-5 text-primary" />
            {isEditing ? t("productForm.titleEdit") : t("productForm.titleCreate")}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEditing ? t("productForm.descEdit") : t("productForm.descCreate")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                {t("productForm.sectionBasic")}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label className="text-cream/80">{t("productForm.name")}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t("productForm.namePlaceholder")}
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label className="text-cream/80">{t("productForm.slug")}</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder={t("productForm.slugPlaceholder")}
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.shortDesc")}</Label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                  placeholder={t("productForm.shortDescPlaceholder")}
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.fullDesc")}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t("productForm.fullDescPlaceholder")}
                  rows={3}
                  className="bg-cream/5 border-gold/20 text-cream resize-none"
                />
              </div>
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                <ImageIcon className="inline h-4 w-4 mr-1" />
                {t("productForm.sectionImages")}
              </h3>

              {/* Main Image */}
              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.mainImage")}</Label>
                <div className="flex gap-3 items-start">
                  {/* Preview */}
                  <div className="w-20 h-24 rounded-lg bg-cream/5 border border-gold/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-cream/20" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                      placeholder={t("productForm.mainImagePlaceholder")}
                      className="bg-cream/5 border-gold/20 text-cream text-xs"
                    />
                    <div className="flex gap-2">
                      <input type="file" accept="image/*" className="hidden" ref={mainImageRef}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMainImageUpload(f); e.target.value = ""; }} />
                      <Button type="button" size="sm" variant="outline" className="border-gold/20 text-cream hover:bg-cream/10"
                        onClick={() => mainImageRef.current?.click()} disabled={isUploadingMain}>
                        {isUploadingMain ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        {t("productForm.upload")}
                      </Button>
                      {formData.image_url && (
                        <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}>
                          <X className="h-3 w-3 mr-1" /> {t("productForm.delete")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.gallery", { count: (formData.gallery_urls || []).length })}</Label>
                
                {/* Gallery grid */}
                {(formData.gallery_urls || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {(formData.gallery_urls || []).map((url, idx) => (
                      <div key={idx} className="relative group aspect-[3/4] rounded-lg bg-cream/5 border border-gold/20 overflow-hidden">
                        <img src={url} alt={`${t("productForm.sectionImages")} ${idx + 1}`} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-noir/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <Button type="button" size="sm" variant="ghost" className="text-cream text-[10px] h-6 px-2"
                            onClick={() => setAsMainImage(url, idx)}>
                            {t("productForm.setMain")}
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="text-destructive text-[10px] h-6 px-2"
                            onClick={() => removeGalleryImage(idx)}>
                            <X className="h-3 w-3" /> {t("productForm.remove")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add gallery images */}
                <div className="flex gap-2">
                  <input type="file" accept="image/*" multiple className="hidden" ref={galleryImageRef}
                    onChange={(e) => { if (e.target.files?.length) handleGalleryImageUpload(e.target.files); e.target.value = ""; }} />
                  <Button type="button" size="sm" variant="outline" className="border-gold/20 text-cream hover:bg-cream/10"
                    onClick={() => galleryImageRef.current?.click()} disabled={isUploadingGallery}>
                    {isUploadingGallery ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                    {t("productForm.addImages")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                {t("productForm.sectionPricing")}
              </h3>

              {/* Purchase price + markup override */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">Prix d'achat (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.purchase_price ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        purchase_price: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder="15000"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                  <p className="text-xs text-cream/50">Coût d'acquisition (usage interne).</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">
                    Marge (%) — laisser vide pour utiliser {pricingConfig?.global_markup_percent ?? 30}%
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.markup_percent_override ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        markup_percent_override: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    placeholder={String(pricingConfig?.global_markup_percent ?? 30)}
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              {/* Live preview */}
              {(() => {
                const purchase = Number(formData.purchase_price ?? 0);
                if (!purchase || !pricingConfig) return null;
                const markup =
                  formData.markup_percent_override ?? pricingConfig.global_markup_percent;
                const ambPercent = pricingConfig.ambassador_percent;
                const b = computePricingBreakdown(purchase, Number(markup), Number(ambPercent));
                const pts = computePointsForPrice(b.salePrice, pricingConfig.points_tiers);
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                        Aperçu de la répartition
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div className="p-2 rounded bg-cream/5 border border-gold/10">
                        <p className="text-cream/50">Vente conseillée</p>
                        <p className="text-primary font-bold">{formatPrice(b.salePrice)}</p>
                        <button
                          type="button"
                          className="mt-1 text-[10px] underline text-cream/60 hover:text-primary"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, price: b.salePrice }))
                          }
                        >
                          Appliquer au prix
                        </button>
                      </div>
                      <div className="p-2 rounded bg-cream/5 border border-gold/10">
                        <p className="text-cream/50">Marge</p>
                        <p className="text-cream font-semibold">{formatPrice(b.margin)}</p>
                      </div>
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/30">
                        <p className="text-cream/60">Ambassadeur</p>
                        <p className="text-green-400 font-semibold">
                          {formatPrice(b.ambassadorEarning)}
                        </p>
                        <p className="text-[10px] text-cream/40">{pts} pts</p>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                        <p className="text-cream/60">Plateforme</p>
                        <p className="text-blue-400 font-semibold">
                          {formatPrice(b.platformEarning)}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-cream/5 border border-gold/10">
                        <p className="text-cream/50">Marge appliquée</p>
                        <p className="text-cream font-semibold">{Number(markup)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.price")}</Label>
                  <Input
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="25000"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.originalPrice")}</Label>
                  <Input
                    type="number"
                    value={formData.original_price || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="30000"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.stock")}</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                    placeholder="10"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.category")}</Label>
                <Select
                  value={formData.category_id || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value || undefined }))}
                >
                  <SelectTrigger className="bg-cream/5 border-gold/20 text-cream">
                    <SelectValue placeholder={t("productForm.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-noir border-gold/20">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-cream">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-gold/20 p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-cream text-sm font-medium">Conditionnements et vente en gros</p>
                      <p className="text-cream/50 text-xs">
                        Activez uniquement les cartons ou caisses réellement disponibles pour ce produit.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={wholesaleEnabled}
                    onCheckedChange={(checked) => {
                      setWholesaleEnabled(checked);
                      if (!checked) setFormData((prev) => ({ ...prev, packaging_options: [] }));
                    }}
                  />
                </div>

                {wholesaleEnabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gold/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-cream font-medium">Disponible en carton</p>
                            <p className="text-[11px] text-cream/50">Formats 3, 6 ou 12 bouteilles.</p>
                          </div>
                          <Switch
                            checked={hasCarton}
                            onCheckedChange={(checked) => {
                              if (!checked) setPackagingOptions((options) => options.filter((option) => option.packaging_type !== "carton"));
                              else upsertPackagingOption(defaultCartonOption(6));
                            }}
                          />
                        </div>
                        {hasCarton && (
                          <div className="flex flex-wrap gap-2">
                            {[3, 6, 12].map((quantity) => {
                              const active = packagingOptions.some((option) => option.packaging_type === "carton" && option.bottle_quantity === quantity);
                              return (
                                <Button
                                  key={quantity}
                                  type="button"
                                  size="sm"
                                  variant={active ? "default" : "outline"}
                                  className={active ? "bg-primary text-noir" : "border-gold/20 text-cream"}
                                  onClick={() =>
                                    active
                                      ? setPackagingOptions((options) => options.filter((option) => !(option.packaging_type === "carton" && option.bottle_quantity === quantity)))
                                      : upsertPackagingOption(defaultCartonOption(quantity))
                                  }
                                >
                                  {quantity} bouteilles
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-gold/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-cream font-medium">Disponible en caisse</p>
                            <p className="text-[11px] text-cream/50">Bois, standard ou autre.</p>
                          </div>
                          <Switch
                            checked={hasCase}
                            onCheckedChange={(checked) => {
                              if (!checked) setPackagingOptions((options) => options.filter((option) => option.packaging_type === "carton"));
                              else upsertPackagingOption(defaultCaseOption());
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {validationErrors.packaging_options && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.packaging_options}
                      </p>
                    )}

                    <div className="space-y-3">
                      {packagingOptions.map((option, index) => {
                        const unitPrice = calculatePackagingUnitPrice(option);
                        const line = calculatePackagingLineTotal(option, 1);
                        return (
                          <div key={`${option.packaging_type}-${option.bottle_quantity}-${index}`} className="rounded-lg border border-gold/10 p-3 space-y-3 bg-cream/5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Switch checked={option.is_active} onCheckedChange={(checked) => patchPackagingOption(index, { is_active: checked })} />
                                <Input
                                  value={option.packaging_label}
                                  onChange={(e) => patchPackagingOption(index, { packaging_label: e.target.value })}
                                  className="bg-noir/50 border-gold/20 text-cream h-9"
                                />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removePackagingOption(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {option.packaging_type !== "carton" && (
                                <div className="space-y-1">
                                  <Label className="text-cream/70 text-xs">Type de caisse</Label>
                                  <Select
                                    value={option.packaging_type}
                                    onValueChange={(value) => patchPackagingOption(index, { packaging_type: value as ProductPackagingFormOption["packaging_type"] })}
                                  >
                                    <SelectTrigger className="bg-noir/50 border-gold/20 text-cream h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-noir border-gold/20">
                                      <SelectItem value="wooden_case">Caisse bois</SelectItem>
                                      <SelectItem value="standard_case">Caisse standard</SelectItem>
                                      <SelectItem value="custom">Autre</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Bouteilles</Label>
                                <Input type="number" value={option.bottle_quantity || ""} onChange={(e) => patchPackagingOption(index, { bottle_quantity: Number(e.target.value) })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Mode de prix</Label>
                                <Select value={option.pricing_mode} onValueChange={(value) => patchPackagingOption(index, { pricing_mode: value as ProductPackagingFormOption["pricing_mode"] })}>
                                  <SelectTrigger className="bg-noir/50 border-gold/20 text-cream h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-noir border-gold/20">
                                    <SelectItem value="manual_total">Prix total manuel</SelectItem>
                                    <SelectItem value="discount_percent">Remise en pourcentage</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Prix total</Label>
                                <Input type="number" value={option.total_price || ""} onChange={(e) => patchPackagingOption(index, { total_price: Number(e.target.value) })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Remise (%)</Label>
                                <Input type="number" value={option.discount_percent ?? ""} onChange={(e) => patchPackagingOption(index, { discount_percent: e.target.value ? Number(e.target.value) : null })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Stock lots</Label>
                                <Input type="number" value={option.stock_quantity ?? ""} onChange={(e) => patchPackagingOption(index, { stock_quantity: e.target.value ? Number(e.target.value) : null })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">SKU</Label>
                                <Input value={option.sku ?? ""} onChange={(e) => patchPackagingOption(index, { sku: e.target.value || null })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-cream/70 text-xs">Poids kg</Label>
                                <Input type="number" step="0.1" value={option.weight_kg ?? ""} onChange={(e) => patchPackagingOption(index, { weight_kg: e.target.value ? Number(e.target.value) : null })} className="bg-noir/50 border-gold/20 text-cream h-9" />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-md bg-noir/40 border border-gold/10 p-2">
                              <p className="text-xs text-cream/60">
                                Prix unitaire: <span className="text-primary font-semibold">{formatPrice(unitPrice)}</span>
                                {" "}· Economie: <span className="text-green-400 font-semibold">{formatPrice(line.discountAmount || 0)}</span>
                              </p>
                              <Label className="text-xs text-cream/70 flex items-center gap-2">
                                <Switch checked={option.show_discount} onCheckedChange={(checked) => patchPackagingOption(index, { show_discount: checked })} />
                                Afficher la reduction
                              </Label>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-cream/70 text-xs">Paliers de reduction</Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-gold/20 text-cream h-8"
                                  onClick={() => patchPackagingOption(index, { discount_tiers: [...(option.discount_tiers || []), { min_quantity: 2, discount_percent: Number(option.discount_percent || 0) }] })}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Palier
                                </Button>
                              </div>
                              {(option.discount_tiers || []).map((tier, tierIndex) => (
                                <div key={tierIndex} className="grid grid-cols-12 gap-2">
                                  <Input
                                    type="number"
                                    value={tier.min_quantity}
                                    onChange={(e) => {
                                      const tiers = [...(option.discount_tiers || [])];
                                      tiers[tierIndex] = { ...tiers[tierIndex], min_quantity: Number(e.target.value) };
                                      patchPackagingOption(index, { discount_tiers: tiers });
                                    }}
                                    className="col-span-5 bg-noir/50 border-gold/20 text-cream h-8"
                                    placeholder="Min lots"
                                  />
                                  <Input
                                    type="number"
                                    value={tier.discount_percent}
                                    onChange={(e) => {
                                      const tiers = [...(option.discount_tiers || [])];
                                      tiers[tierIndex] = { ...tiers[tierIndex], discount_percent: Number(e.target.value) };
                                      patchPackagingOption(index, { discount_tiers: tiers });
                                    }}
                                    className="col-span-5 bg-noir/50 border-gold/20 text-cream h-8"
                                    placeholder="Remise %"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="col-span-2 h-8 text-destructive"
                                    onClick={() => patchPackagingOption(index, { discount_tiers: (option.discount_tiers || []).filter((_, idx) => idx !== tierIndex) })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Caisse / carton */}
              <div className="hidden rounded-lg border border-gold/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-cream text-sm font-medium">Disponible en caisse / carton</p>
                      <p className="text-cream/50 text-xs">
                        Le produit apparaîtra aussi dans la catégorie « Caisse ».
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.available_as_case ?? false}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, available_as_case: checked }))
                    }
                  />
                </div>
                {formData.available_as_case && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-cream/70 text-xs">Unités par caisse</Label>
                      <Input
                        type="number"
                        value={formData.units_per_case ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            units_per_case: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        placeholder="12"
                        className={`bg-cream/5 border-gold/20 text-cream ${validationErrors.units_per_case ? "border-destructive" : ""}`}
                      />
                      {validationErrors.units_per_case && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.units_per_case}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-cream/70 text-xs">Prix par caisse (FCFA)</Label>
                      <Input
                        type="number"
                        value={formData.case_price ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            case_price: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                        placeholder="150000"
                        className={`bg-cream/5 border-gold/20 text-cream ${validationErrors.case_price ? "border-destructive" : ""}`}
                      />
                      {validationErrors.case_price && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.case_price}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Points ambassadeur (par produit) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="inline h-4 w-4" />
                Points ambassadeur (spécifique à ce produit)
              </h3>
              <div className="rounded-lg border border-gold/20 p-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-cream/80">
                    Points fixes (facultatif)
                  </Label>
                  <Input
                    type="number"
                    value={formData.points_override ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        points_override: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="Laisser vide pour utiliser les paliers"
                    className={`bg-cream/5 border-gold/20 text-cream ${validationErrors.points_override ? "border-destructive" : ""}`}
                  />
                  <p className="text-[11px] text-cream/50">
                    Si renseigné, ce nombre remplace tous les paliers pour ce
                    produit.
                  </p>
                  {validationErrors.points_override && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.points_override}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-gold/10">
                  <Label className="text-cream/80">
                    Paliers spécifiques (facultatif)
                  </Label>
                  <p className="text-[11px] text-cream/50">
                    Utilisés uniquement si aucun nombre fixe n'est défini.
                    Sinon, les paliers de la catégorie ou globaux s'appliquent.
                  </p>
                  {productTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-6">
                        <Label className="text-cream/60 text-[11px]">
                          Prix jusqu'à (FCFA)
                        </Label>
                        <Input
                          type="number"
                          placeholder="Illimité"
                          value={tier.max ?? ""}
                          onChange={(e) =>
                            updateProductTier(idx, {
                              max: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          className="bg-cream/5 border-gold/20 text-cream h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-cream/60 text-[11px]">
                          Points
                        </Label>
                        <Input
                          type="number"
                          value={tier.points}
                          onChange={(e) =>
                            updateProductTier(idx, {
                              points: Number(e.target.value),
                            })
                          }
                          className="bg-cream/5 border-gold/20 text-cream h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => removeProductTier(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProductTier}
                    className="border-gold/30 text-cream hover:bg-cream/10"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Ajouter un palier
                  </Button>
                </div>
              </div>
            </div>

            {/* Wine Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                {t("productForm.sectionWine")}
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.alcohol")}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.alcohol_percentage || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, alcohol_percentage: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="13.5"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.volume")}</Label>
                  <Input
                    type="number"
                    value={formData.volume_ml || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, volume_ml: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="750"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.vintage")}</Label>
                  <Input
                    type="number"
                    value={formData.vintage_year || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vintage_year: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="2020"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.country")}</Label>
                  <Input
                    value={formData.origin_country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, origin_country: e.target.value }))}
                    placeholder="France"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.region")}</Label>
                  <Input
                    value={formData.region}
                    onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                    placeholder="Bordeaux"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.grape")}</Label>
                  <Input
                    value={formData.grape_variety}
                    onChange={(e) => setFormData((prev) => ({ ...prev, grape_variety: e.target.value }))}
                    placeholder="Cabernet Sauvignon, Merlot"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">{t("productForm.servingTemp")}</Label>
                  <Input
                    value={formData.serving_temperature}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serving_temperature: e.target.value }))}
                    placeholder="16-18°C"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.tastingNotes")}</Label>
                <Textarea
                  value={formData.tasting_notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tasting_notes: e.target.value }))}
                  placeholder={t("productForm.tastingNotesPlaceholder")}
                  rows={2}
                  className="bg-cream/5 border-gold/20 text-cream resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">{t("productForm.foodPairing")}</Label>
                <Input
                  value={formData.food_pairing}
                  onChange={(e) => setFormData((prev) => ({ ...prev, food_pairing: e.target.value }))}
                  placeholder={t("productForm.foodPairingPlaceholder")}
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                {t("productForm.sectionOptions")}
              </h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <div>
                    <p className="text-cream font-medium">{t("productForm.productActive")}</p>
                    <p className="text-cream/50 text-sm">{t("productForm.productActiveDesc")}</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <div>
                    <p className="text-cream font-medium">{t("productForm.productFeatured")}</p>
                    <p className="text-cream/50 text-sm">{t("productForm.productFeaturedDesc")}</p>
                  </div>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t border-gold/20">
          <Button
            variant="outline"
            className="flex-1 border-gold/30 text-cream hover:bg-cream/10"
            onClick={() => onOpenChange(false)}
          >
            {t("productForm.cancel")}
          </Button>
          <Button
            className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
            onClick={handleSubmit}
            disabled={hasErrors || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? t("productForm.saving") : t("productForm.creating")}
              </>
            ) : (
              <>
                {isEditing ? t("productForm.save") : t("productForm.create")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
