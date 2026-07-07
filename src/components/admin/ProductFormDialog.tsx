import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Wine, Loader2, Image as ImageIcon, Upload, X, Plus, GripVertical, Calculator, Package } from "lucide-react";
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
} from "@/hooks/usePricingConfig";
import { useFormatPrice } from "@/hooks/useFormatPrice";

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
    available_as_case: false,
    units_per_case: null,
    case_price: null,
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
        available_as_case: (p.available_as_case as boolean) ?? false,
        units_per_case: (p.units_per_case as number | null) ?? null,
        case_price: (p.case_price as number | null) ?? null,
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
        available_as_case: false,
        units_per_case: null,
        case_price: null,
      });
    }
  }, [product, open]);

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

  const handleSubmit = async () => {
    await onSave(formData, product?.id);
  };

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

              {/* Caisse / carton */}
              <div className="rounded-lg border border-gold/20 p-3 space-y-3">
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
                        className="bg-cream/5 border-gold/20 text-cream"
                      />
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
                        className="bg-cream/5 border-gold/20 text-cream"
                      />
                    </div>
                  </div>
                )}
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
            disabled={!formData.name || !formData.price || isSaving}
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
