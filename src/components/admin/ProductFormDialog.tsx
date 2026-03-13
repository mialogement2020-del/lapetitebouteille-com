import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Wine, Loader2, Image as ImageIcon, Upload, X, Plus, GripVertical } from "lucide-react";
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
  const isEditing = !!product;
  const mainImageRef = useRef<HTMLInputElement>(null);
  const galleryImageRef = useRef<HTMLInputElement>(null);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  
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
  });

  useEffect(() => {
    if (product) {
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
      toast({ title: "Image principale uploadée" });
    } catch (err) {
      toast({ title: "Erreur d'upload", description: err instanceof Error ? err.message : "Échec", variant: "destructive" });
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
      toast({ title: `${urls.length} image(s) ajoutée(s) à la galerie` });
    } catch (err) {
      toast({ title: "Erreur d'upload", description: err instanceof Error ? err.message : "Échec", variant: "destructive" });
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
            {isEditing ? "Modifier le produit" : "Ajouter un produit"}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEditing
              ? "Modifiez les informations du produit"
              : "Remplissez les informations pour créer un nouveau produit"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Informations de base
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label className="text-cream/80">Nom du produit *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Château Margaux 2015"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label className="text-cream/80">Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="chateau-margaux-2015"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">Description courte</Label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                  placeholder="Un grand cru classé d'exception"
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">Description complète</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description détaillée du produit..."
                  rows={3}
                  className="bg-cream/5 border-gold/20 text-cream resize-none"
                />
              </div>
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                <ImageIcon className="inline h-4 w-4 mr-1" />
                Images
              </h3>

              {/* Main Image */}
              <div className="space-y-2">
                <Label className="text-cream/80">Image principale</Label>
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
                      placeholder="https://... ou uploadez un fichier"
                      className="bg-cream/5 border-gold/20 text-cream text-xs"
                    />
                    <div className="flex gap-2">
                      <input type="file" accept="image/*" className="hidden" ref={mainImageRef}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMainImageUpload(f); e.target.value = ""; }} />
                      <Button type="button" size="sm" variant="outline" className="border-gold/20 text-cream hover:bg-cream/10"
                        onClick={() => mainImageRef.current?.click()} disabled={isUploadingMain}>
                        {isUploadingMain ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Uploader
                      </Button>
                      {formData.image_url && (
                        <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}>
                          <X className="h-3 w-3 mr-1" /> Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <Label className="text-cream/80">Galerie ({(formData.gallery_urls || []).length} images)</Label>
                
                {/* Gallery grid */}
                {(formData.gallery_urls || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {(formData.gallery_urls || []).map((url, idx) => (
                      <div key={idx} className="relative group aspect-[3/4] rounded-lg bg-cream/5 border border-gold/20 overflow-hidden">
                        <img src={url} alt={`Galerie ${idx + 1}`} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-noir/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <Button type="button" size="sm" variant="ghost" className="text-cream text-[10px] h-6 px-2"
                            onClick={() => setAsMainImage(url, idx)}>
                            ⭐ Principale
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="text-destructive text-[10px] h-6 px-2"
                            onClick={() => removeGalleryImage(idx)}>
                            <X className="h-3 w-3" /> Retirer
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
                    Ajouter des images
                  </Button>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Prix & Stock
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">Prix (FCFA) *</Label>
                  <Input
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="25000"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">Prix original</Label>
                  <Input
                    type="number"
                    value={formData.original_price || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="30000"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">Stock</Label>
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
                <Label className="text-cream/80">Catégorie</Label>
                <Select
                  value={formData.category_id || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value || undefined }))}
                >
                  <SelectTrigger className="bg-cream/5 border-gold/20 text-cream">
                    <SelectValue placeholder="Sélectionner une catégorie" />
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
            </div>

            {/* Wine Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Détails du vin
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-cream/80">Alcool (%)</Label>
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
                  <Label className="text-cream/80">Volume (ml)</Label>
                  <Input
                    type="number"
                    value={formData.volume_ml || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, volume_ml: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="750"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">Millésime</Label>
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
                  <Label className="text-cream/80">Pays d'origine</Label>
                  <Input
                    value={formData.origin_country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, origin_country: e.target.value }))}
                    placeholder="France"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">Région</Label>
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
                  <Label className="text-cream/80">Cépage</Label>
                  <Input
                    value={formData.grape_variety}
                    onChange={(e) => setFormData((prev) => ({ ...prev, grape_variety: e.target.value }))}
                    placeholder="Cabernet Sauvignon, Merlot"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cream/80">Température de service</Label>
                  <Input
                    value={formData.serving_temperature}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serving_temperature: e.target.value }))}
                    placeholder="16-18°C"
                    className="bg-cream/5 border-gold/20 text-cream"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">Notes de dégustation</Label>
                <Textarea
                  value={formData.tasting_notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tasting_notes: e.target.value }))}
                  placeholder="Arômes de fruits noirs, tanins soyeux..."
                  rows={2}
                  className="bg-cream/5 border-gold/20 text-cream resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cream/80">Accords mets</Label>
                <Input
                  value={formData.food_pairing}
                  onChange={(e) => setFormData((prev) => ({ ...prev, food_pairing: e.target.value }))}
                  placeholder="Viandes rouges, fromages affinés"
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                Options
              </h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <div>
                    <p className="text-cream font-medium">Produit actif</p>
                    <p className="text-cream/50 text-sm">Visible dans le catalogue</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <div>
                    <p className="text-cream font-medium">Produit en vedette</p>
                    <p className="text-cream/50 text-sm">Affiché sur la page d'accueil</p>
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
            Annuler
          </Button>
          <Button
            className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.price || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Modification..." : "Création..."}
              </>
            ) : (
              <>
                {isEditing ? "Enregistrer" : "Créer le produit"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
