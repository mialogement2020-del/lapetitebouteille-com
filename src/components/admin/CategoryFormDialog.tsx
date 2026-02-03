import { useState, useEffect } from "react";
import { FolderOpen, Loader2, AlertTriangle } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminCategory, CategoryFormData } from "@/hooks/useAdmin";

interface CategoryFormDialogProps {
  category: AdminCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CategoryFormData, id?: string) => Promise<void>;
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

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: CategoryFormDialogProps) {
  const isEditing = !!category;
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    display_order: 0,
    is_active: true,
    low_stock_threshold: null,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
        low_stock_threshold: category.low_stock_threshold,
      });
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        display_order: 0,
        is_active: true,
        low_stock_threshold: null,
      });
    }
  }, [category, open]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !isEditing || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async () => {
    await onSave(formData, category?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            {isEditing ? "Modifier la catégorie" : "Ajouter une catégorie"}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEditing
              ? "Modifiez les informations de la catégorie"
              : "Remplissez les informations pour créer une nouvelle catégorie"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-cream/80">Nom de la catégorie *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Vins Rouges"
              className="bg-cream/5 border-gold/20 text-cream"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">Slug</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="vins-rouges"
              className="bg-cream/5 border-gold/20 text-cream font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la catégorie..."
              rows={3}
              className="bg-cream/5 border-gold/20 text-cream resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
                className="bg-cream/5 border-gold/20 text-cream flex-1"
              />
              {formData.image_url && (
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-cream/10 flex-shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">Ordre d'affichage</Label>
            <Input
              type="number"
              value={formData.display_order || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) }))}
              placeholder="0"
              className="bg-cream/5 border-gold/20 text-cream w-24"
            />
            <p className="text-cream/40 text-xs">Plus le nombre est petit, plus la catégorie apparaît en premier</p>
          </div>

          {/* Stock Alert Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-cream/80">Seuil d'alerte de stock</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-primary/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-noir border-gold/30 text-cream max-w-xs">
                    <p>Ce seuil sera utilisé pour tous les produits de cette catégorie qui n'ont pas de seuil personnalisé.</p>
                    <p className="text-cream/60 text-xs mt-1">Priorité : Produit → Catégorie → Global (5)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              type="number"
              min="1"
              max="100"
              value={formData.low_stock_threshold ?? ""}
              onChange={(e) => setFormData((prev) => ({ 
                ...prev, 
                low_stock_threshold: e.target.value ? Number(e.target.value) : null 
              }))}
              placeholder="Non défini (utilise le seuil global)"
              className="bg-cream/5 border-gold/20 text-cream w-full"
            />
            <p className="text-cream/40 text-xs">Laissez vide pour utiliser le seuil global par défaut (5 unités)</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
            <div>
              <p className="text-cream font-medium">Catégorie active</p>
              <p className="text-cream/50 text-sm">Visible dans le catalogue</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gold/20">
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
            disabled={!formData.name || !formData.slug || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Modification..." : "Création..."}
              </>
            ) : (
              <>{isEditing ? "Modifier" : "Créer"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
