import { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Eye, EyeOff, Upload, LayoutGrid, GripVertical, History, Undo2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useHomeCategories, useSaveHomeCategory, useDeleteHomeCategory,
  uploadHomeCategoryImage, type HomeCategory,
} from "@/hooks/useHomeCategories";
import { useHomeCategoriesHistory, useRollbackHomeCategory } from "@/hooks/useHomeCategoriesHistory";
import { toast } from "@/hooks/use-toast";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const empty: Partial<HomeCategory> = {
  slug: "", title_fr: "", title_en: "", description_fr: "", description_en: "",
  image_url: "", href: "/catalogue", display_order: 0, is_visible: true,
};

export function HomeCategoriesManager() {
  const { data: items, isLoading } = useHomeCategories();
  const save = useSaveHomeCategory();
  const del = useDeleteHomeCategory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history, refetch: refetchHistory } = useHomeCategoriesHistory();
  const rollback = useRollbackHomeCategory();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<HomeCategory>>(empty);
  const [uploading, setUploading] = useState(false);

  const openNew = () => {
    setForm({ ...empty, display_order: (items?.length ?? 0) + 1 });
    setOpen(true);
  };
  const openEdit = (c: HomeCategory) => { setForm(c); setOpen(true); };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const slug = form.slug || slugify(form.title_fr || "cat");
      const url = await uploadHomeCategoryImage(file, slug);
      setForm(f => ({ ...f, image_url: url }));
      toast({ title: "Image téléversée" });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title_fr || !form.image_url) {
      toast({ title: "Titre et image requis", variant: "destructive" });
      return;
    }
    try {
      await save.mutateAsync({
        ...form,
        slug: form.slug || slugify(form.title_fr),
        title_fr: form.title_fr!,
      } as any);
      toast({ title: form.id ? "Catégorie mise à jour" : "Catégorie créée" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const onDragEnd = async (evt: any) => {
    const { active, over } = evt;
    if (!over || active.id === over.id || !items) return;
    const oldIdx = items.findIndex(x => x.id === active.id);
    const newIdx = items.findIndex(x => x.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    try {
      await Promise.all(reordered.map((c, i) =>
        save.mutateAsync({ id: c.id, slug: c.slug, title_fr: c.title_fr, display_order: i + 1 } as any)
      ));
    } catch (e: any) {
      toast({ title: "Erreur réordonnancement", description: e.message, variant: "destructive" });
    }
  };

  const toggleVisible = async (c: HomeCategory) => {
    await save.mutateAsync({ id: c.id, slug: c.slug, title_fr: c.title_fr, is_visible: !c.is_visible } as any);
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ?")) return;
    try {
      await del.mutateAsync(id);
      toast({ title: "Supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-serif text-2xl">Catégories Accueil</h2>
            <p className="text-sm text-muted-foreground">Glissez les cartes pour réordonner. Un historique complet est disponible.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setHistoryOpen(true); refetchHistory(); }}>
            <History className="h-4 w-4 mr-2" /> Historique
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nouvelle catégorie</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !items?.length ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
          Aucune catégorie. Créez-en une.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map(c => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((c) => (
                <SortableCategoryCard key={c.id} c={c}
                  onEdit={() => openEdit(c)}
                  onToggle={() => toggleVisible(c)}
                  onDelete={() => remove(c.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Image *</Label>
              {form.image_url && (
                <div className="mb-2 h-40 rounded-lg overflow-hidden border border-border">
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="URL de l'image (Unsplash, CDN, ...)"
                  value={form.image_url ?? ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
                <Button variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                    />
                  </label>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Titre (FR) *</Label>
                <Input value={form.title_fr ?? ""} onChange={(e) => setForm({ ...form, title_fr: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Titre (EN)</Label>
                <Input value={form.title_en ?? ""} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Description (FR)</Label>
                <Textarea rows={2} value={form.description_fr ?? ""} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} />
              </div>
              <div>
                <Label>Description (EN)</Label>
                <Textarea rows={2} value={form.description_en ?? ""} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label>Lien de destination *</Label>
                <Input placeholder="/catalogue?category=vins" value={form.href ?? ""} onChange={(e) => setForm({ ...form, href: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Label>Ordre</Label>
                <Input type="number" className="w-24" value={form.display_order ?? 0}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="visible">Visible sur l'accueil</Label>
                <Switch id="visible" checked={form.is_visible ?? true}
                  onCheckedChange={(v) => setForm({ ...form, is_visible: v })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {form.id ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}