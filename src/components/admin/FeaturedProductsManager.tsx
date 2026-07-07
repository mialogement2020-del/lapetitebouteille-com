import { useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, Trash2, Eye, EyeOff, GripVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  useFeaturedHomeProducts, useSaveFeatured, useDeleteFeatured, type FeaturedRow,
} from "@/hooks/useFeaturedHomeProducts";
import { useProducts } from "@/hooks/useProducts";
import { useFormatPrice } from "@/hooks/useFormatPrice";

function SortableCard({ row, onEdit, onDelete, onToggle }: {
  row: FeaturedRow; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const formatPrice = useFormatPrice();
  const p = row.product;

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
      <button className="cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <img src={p?.image_url || "/placeholder.svg"} alt="" className="w-14 h-14 object-cover rounded" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{row.custom_title_fr || p?.name || "—"}</div>
        <div className="text-xs text-muted-foreground truncate">
          {formatPrice(row.custom_price ?? p?.price ?? 0)}
          {row.custom_title_fr && <Badge className="ml-2" variant="secondary">Personnalisé</Badge>}
        </div>
      </div>
      <Badge variant="outline">#{row.display_order}</Badge>
      <Button size="icon" variant="ghost" onClick={onToggle}>
        {row.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={onEdit}><Sparkles className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

export function FeaturedProductsManager() {
  const { data: rows, isLoading } = useFeaturedHomeProducts();
  const { data: allProducts } = useProducts({ limit: 500 });
  const save = useSaveFeatured();
  const del = useDeleteFeatured();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editRow, setEditRow] = useState<FeaturedRow | null>(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (evt: any) => {
    const { active, over } = evt;
    if (!over || active.id === over.id || !rows) return;
    const oldIdx = rows.findIndex(r => r.id === active.id);
    const newIdx = rows.findIndex(r => r.id === over.id);
    const reordered = arrayMove(rows, oldIdx, newIdx);
    try {
      await Promise.all(reordered.map((r, i) =>
        save.mutateAsync({ id: r.id, product_id: r.product_id, display_order: i + 1 })
      ));
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const featuredIds = new Set((rows ?? []).map(r => r.product_id));
  const candidates = (allProducts ?? []).filter(p =>
    !featuredIds.has(p.id) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 30);

  const addProduct = async (productId: string) => {
    try {
      await save.mutateAsync({
        product_id: productId,
        display_order: (rows?.length ?? 0) + 1,
        is_visible: true,
      });
      toast({ title: "Produit ajouté" });
      setPickerOpen(false);
      setSearch("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl">Nouveautés — Section Accueil</h2>
          <p className="text-sm text-muted-foreground">Produits mis en avant sur la page d'accueil. Glissez pour réordonner.</p>
        </div>
        <Button onClick={() => setPickerOpen(true)}><Plus className="h-4 w-4 mr-2" />Ajouter un produit</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : !rows?.length ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
          Aucun produit sélectionné.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {rows.map(r => (
                <SortableCard key={r.id} row={r}
                  onEdit={() => setEditRow(r)}
                  onDelete={async () => {
                    if (!confirm("Retirer ce produit ?")) return;
                    await del.mutateAsync(r.id);
                  }}
                  onToggle={() => save.mutate({ id: r.id, product_id: r.product_id, is_visible: !r.is_visible })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Choisir un produit</DialogTitle></DialogHeader>
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="space-y-2 mt-3">
            {candidates.map(p => (
              <button key={p.id} onClick={() => addProduct(p.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left">
                <img src={p.image_url || "/placeholder.svg"} className="w-12 h-12 object-cover rounded" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.category?.name}</div>
                </div>
              </button>
            ))}
            {!candidates.length && <p className="text-sm text-muted-foreground text-center py-8">Aucun produit</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit custom fields */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Personnalisation</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div><Label>Titre personnalisé (FR)</Label>
                <Input value={editRow.custom_title_fr ?? ""}
                  onChange={e => setEditRow({ ...editRow, custom_title_fr: e.target.value })} /></div>
              <div><Label>Titre personnalisé (EN)</Label>
                <Input value={editRow.custom_title_en ?? ""}
                  onChange={e => setEditRow({ ...editRow, custom_title_en: e.target.value })} /></div>
              <div><Label>Prix affiché personnalisé (FCFA)</Label>
                <Input type="number" value={editRow.custom_price ?? ""}
                  onChange={e => setEditRow({ ...editRow, custom_price: e.target.value ? Number(e.target.value) : null })} />
                <p className="text-xs text-muted-foreground mt-1">Laisser vide pour utiliser le prix produit.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Annuler</Button>
            <Button onClick={async () => {
              if (!editRow) return;
              await save.mutateAsync({
                id: editRow.id, product_id: editRow.product_id,
                custom_title_fr: editRow.custom_title_fr, custom_title_en: editRow.custom_title_en,
                custom_price: editRow.custom_price,
              });
              setEditRow(null);
              toast({ title: "Enregistré" });
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}