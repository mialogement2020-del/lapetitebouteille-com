import { useState, useEffect } from "react";
import { FolderOpen, Loader2, AlertTriangle, Sparkles, Plus, Trash2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminCategory, CategoryFormData } from "@/hooks/useAdmin";

interface PointsTier {
  max: number | null;
  points: number;
}

interface CategoryFormDialogProps {
  category: AdminCategory | null;
  allCategories?: AdminCategory[];
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
  allCategories = [],
  open,
  onOpenChange,
  onSave,
  isSaving,
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!category;
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    display_order: 0,
    is_active: true,
    low_stock_threshold: null,
    parent_id: null,
  });
  const [pointsTiers, setPointsTiers] = useState<PointsTier[]>([]);

  useEffect(() => {
    if (category) {
      const c = category as unknown as Record<string, unknown>;
      const t = c.points_tiers_override;
      setPointsTiers(Array.isArray(t) ? (t as PointsTier[]) : []);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
        low_stock_threshold: category.low_stock_threshold,
        parent_id: category.parent_id || null,
      });
    } else {
      setPointsTiers([]);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image_url: "",
        display_order: 0,
        is_active: true,
        low_stock_threshold: null,
        parent_id: null,
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
    await onSave(
      {
        ...formData,
        points_tiers_override:
          pointsTiers.length > 0 ? pointsTiers : null,
      } as CategoryFormData & { points_tiers_override: PointsTier[] | null },
      category?.id,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-primary" />
            {isEditing ? t("categoryForm.editTitle") : t("categoryForm.createTitle")}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEditing ? t("categoryForm.editDesc") : t("categoryForm.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-cream/80">{t("categoryForm.name")}</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("categoryForm.namePh")}
              className="bg-cream/5 border-gold/20 text-cream"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">{t("categoryForm.slug")}</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder={t("categoryForm.slugPh")}
              className="bg-cream/5 border-gold/20 text-cream font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">{t("categoryForm.parent")}</Label>
            <Select
              value={formData.parent_id || "none"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value === "none" ? null : value }))}
            >
              <SelectTrigger className="bg-cream/5 border-gold/20 text-cream">
                <SelectValue placeholder={t("categoryForm.parentNone")} />
              </SelectTrigger>
              <SelectContent className="bg-noir border-gold/20">
                <SelectItem value="none" className="text-cream">{t("categoryForm.parentNone")}</SelectItem>
                {allCategories
                  .filter(c => !c.parent_id && c.id !== category?.id)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-cream">{c.name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">{t("categoryForm.description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("categoryForm.descriptionPh")}
              rows={3}
              className="bg-cream/5 border-gold/20 text-cream resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-cream/80">{t("categoryForm.imageUrl")}</Label>
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
            <Label className="text-cream/80">{t("categoryForm.displayOrder")}</Label>
            <Input
              type="number"
              value={formData.display_order || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, display_order: Number(e.target.value) }))}
              placeholder="0"
              className="bg-cream/5 border-gold/20 text-cream w-24"
            />
            <p className="text-cream/40 text-xs">{t("categoryForm.displayOrderHint")}</p>
          </div>

          {/* Stock Alert Threshold */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-cream/80">{t("categoryForm.stockThreshold")}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-primary/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-noir border-gold/30 text-cream max-w-xs">
                    <p>{t("categoryForm.stockThresholdTooltip")}</p>
                    <p className="text-cream/60 text-xs mt-1">{t("categoryForm.stockThresholdPriority")}</p>
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
              placeholder={t("categoryForm.stockThresholdPh")}
              className="bg-cream/5 border-gold/20 text-cream w-full"
            />
            <p className="text-cream/40 text-xs">{t("categoryForm.stockThresholdHint")}</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-cream/5 border border-gold/10">
            <div>
              <p className="text-cream font-medium">{t("categoryForm.active")}</p>
              <p className="text-cream/50 text-sm">{t("categoryForm.activeHint")}</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>

          {/* Points ambassadeur — paliers spécifiques à la gamme */}
          <div className="space-y-2 pt-3 border-t border-gold/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="text-cream/80">Paliers de points (gamme)</Label>
            </div>
            <p className="text-cream/40 text-xs">
              Utilisés pour tous les produits de cette catégorie qui n'ont pas leur
              propre configuration. Sinon, les paliers globaux s'appliquent.
            </p>
            {pointsTiers.map((tier, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <Label className="text-cream/60 text-[11px]">
                    Prix jusqu'à (FCFA)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Illimité"
                    value={tier.max ?? ""}
                    onChange={(e) =>
                      setPointsTiers((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, max: e.target.value ? Number(e.target.value) : null }
                            : x,
                        ),
                      )
                    }
                    className="bg-cream/5 border-gold/20 text-cream h-8 text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-cream/60 text-[11px]">Points</Label>
                  <Input
                    type="number"
                    value={tier.points}
                    onChange={(e) =>
                      setPointsTiers((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, points: Number(e.target.value) } : x,
                        ),
                      )
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
                    onClick={() =>
                      setPointsTiers((prev) => prev.filter((_, i) => i !== idx))
                    }
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
              onClick={() =>
                setPointsTiers((prev) => [...prev, { max: null, points: 10 }])
              }
              className="border-gold/30 text-cream hover:bg-cream/10"
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter un palier
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gold/20">
          <Button
            variant="outline"
            className="flex-1 border-gold/30 text-cream hover:bg-cream/10"
            onClick={() => onOpenChange(false)}
          >
            {t("categoryForm.cancel")}
          </Button>
          <Button
            className="flex-1 bg-gradient-gold text-noir font-semibold hover:opacity-90"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.slug || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? t("categoryForm.editing") : t("categoryForm.creating")}
              </>
            ) : (
              <>{isEditing ? t("categoryForm.edit") : t("categoryForm.create")}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
