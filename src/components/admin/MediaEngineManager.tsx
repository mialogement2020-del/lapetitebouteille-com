import { useState } from "react";
import { Plus, Edit, Trash2, Eye, BookOpen, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useAdminArticles, useMediaCategories, useSaveArticle, useDeleteArticle,
  type MediaArticle,
} from "@/hooks/useMediaArticles";
import { toast } from "@/hooks/use-toast";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyForm = {
  id: undefined as string | undefined,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category_id: "" as string,
  author_name: "",
  tags: "" as string,
  status: "draft",
  reading_time_minutes: 3,
  seo_title: "",
  seo_description: "",
  featured: false,
};

export function MediaEngineManager() {
  const { data: articles, isLoading } = useAdminArticles();
  const { data: categories } = useMediaCategories();
  const save = useSaveArticle();
  const del = useDeleteArticle();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: MediaArticle) => {
    setForm({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt ?? "",
      content: a.content,
      cover_image_url: a.cover_image_url ?? "",
      category_id: a.category_id ?? "",
      author_name: a.author_name ?? "",
      tags: (a.tags ?? []).join(", "),
      status: a.status,
      reading_time_minutes: a.reading_time_minutes,
      seo_title: a.seo_title ?? "",
      seo_description: a.seo_description ?? "",
      featured: a.featured,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title || !form.content) {
      toast({ title: "Titre et contenu requis", variant: "destructive" });
      return;
    }
    const slug = form.slug || slugify(form.title);
    try {
      await save.mutateAsync({
        id: form.id,
        title: form.title,
        slug,
        excerpt: form.excerpt || null,
        content: form.content,
        cover_image_url: form.cover_image_url || null,
        category_id: form.category_id || null,
        author_name: form.author_name || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: form.status,
        reading_time_minutes: Number(form.reading_time_minutes) || 3,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        featured: form.featured,
      } as any);
      toast({ title: form.id ? "Article mis à jour" : "Article créé" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await del.mutateAsync(id);
      toast({ title: "Article supprimé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-serif text-2xl">Media Engine</h2>
            <p className="text-sm text-muted-foreground">Gestion du magazine éditorial LPB</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nouvel article
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !articles?.length ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
          Aucun article. Créez le premier pour lancer le magazine.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Titre</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Vues</th>
                <th className="p-3">Publié</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">/{a.slug}</div>
                  </td>
                  <td className="p-3">{a.category?.name ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={a.status === "published" ? "default" : "outline"}>
                      {a.status}
                    </Badge>
                    {a.featured && <Badge className="ml-2" variant="secondary">★</Badge>}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {a.view_count}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {a.status === "published" && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={`/magazine/${a.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })}
                />
              </div>
              <div>
                <Label>Slug URL</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Extrait</Label>
              <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>

            <div>
              <Label>Contenu * (paragraphes séparés par une ligne vide)</Label>
              <Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Image de couverture (URL)</Label>
                <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Auteur</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
              </div>
              <div>
                <Label>Tags (séparés par ,)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div>
                <Label>Temps de lecture (min)</Label>
                <Input type="number" value={form.reading_time_minutes}
                  onChange={(e) => setForm({ ...form, reading_time_minutes: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>SEO Title</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </div>
              <div>
                <Label>SEO Description</Label>
                <Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="featured">Article vedette</Label>
                <Switch id="featured" checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })} />
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