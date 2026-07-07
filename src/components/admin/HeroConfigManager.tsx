import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload, Eye, Save, Rocket, Image as ImageIcon, Film, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useHeroConfig, useSaveHeroDraft, usePublishHero, type HeroData } from "@/hooks/useHeroConfig";
import { supabase } from "@/integrations/supabase/client";

const emptyHero: HeroData = {
  media_type: "image", background_url: "", video_url: "",
  badge_fr: "", badge_en: "", title_line1_fr: "", title_line1_en: "",
  title_highlight_fr: "", title_highlight_en: "", subtitle_fr: "", subtitle_en: "",
  cta_primary_label_fr: "", cta_primary_label_en: "", cta_primary_link: "/catalogue",
  cta_secondary_label_fr: "", cta_secondary_label_en: "", cta_secondary_link: "/ambassadeur",
};

export function HeroConfigManager() {
  const { data: config, isLoading } = useHeroConfig();
  const saveDraft = useSaveHeroDraft();
  const publish = usePublishHero();

  const [form, setForm] = useState<HeroData>(emptyHero);
  const [uploading, setUploading] = useState(false);
  const [previewLang, setPreviewLang] = useState<"fr" | "en">("fr");

  useEffect(() => {
    if (!config) return;
    const merged = { ...emptyHero, ...(config.published ?? {}), ...(config.draft ?? {}) };
    setForm(merged as HeroData);
  }, [config]);

  const set = <K extends keyof HeroData>(k: K, v: HeroData[K]) => setForm(f => ({ ...f, [k]: v }));

  const upload = async (file: File, field: "background_url" | "video_url") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `hero/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set(field, data.publicUrl);
      toast({ title: "Média téléversé" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const onSaveDraft = async () => {
    try { await saveDraft.mutateAsync(form); toast({ title: "Brouillon enregistré" }); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const onPublish = async () => {
    if (!confirm("Publier ce Héro en production ?")) return;
    try { await publish.mutateAsync(form); toast({ title: "Héro publié" }); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const onRevert = () => {
    if (config?.published) {
      setForm({ ...emptyHero, ...(config.published as any) });
      toast({ title: "Brouillon abandonné" });
    }
  };

  const hasDraft = useMemo(() => config?.draft && Object.keys(config.draft).length > 0, [config]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  const previewTitleLine1 = previewLang === "fr" ? form.title_line1_fr : form.title_line1_en;
  const previewHighlight = previewLang === "fr" ? form.title_highlight_fr : form.title_highlight_en;
  const previewSubtitle = previewLang === "fr" ? form.subtitle_fr : form.subtitle_en;
  const previewBadge = previewLang === "fr" ? form.badge_fr : form.badge_en;
  const previewCta1 = previewLang === "fr" ? form.cta_primary_label_fr : form.cta_primary_label_en;
  const previewCta2 = previewLang === "fr" ? form.cta_secondary_label_fr : form.cta_secondary_label_en;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Section Héro (Accueil)</h2>
          <p className="text-sm text-muted-foreground">
            {hasDraft ? "Brouillon non publié en cours." : "Aucun brouillon."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" onClick={onRevert}><Undo2 className="h-4 w-4 mr-2" />Réinitialiser</Button>
          <Button variant="outline" onClick={onSaveDraft} disabled={saveDraft.isPending}>
            {saveDraft.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Sauver brouillon
          </Button>
          <Button onClick={onPublish} disabled={publish.isPending}>
            {publish.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
            Publier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4 border border-border rounded-xl p-5 bg-card">
          <div>
            <Label>Type de média</Label>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant={form.media_type === "image" ? "default" : "outline"} onClick={() => set("media_type", "image")}>
                <ImageIcon className="h-4 w-4 mr-2" />Image
              </Button>
              <Button size="sm" variant={form.media_type === "video" ? "default" : "outline"} onClick={() => set("media_type", "video")}>
                <Film className="h-4 w-4 mr-2" />Vidéo
              </Button>
            </div>
          </div>

          <div>
            <Label>URL image de fond</Label>
            <div className="flex gap-2">
              <Input value={form.background_url} onChange={e => set("background_url", e.target.value)} placeholder="https://..." />
              <Button variant="outline" asChild disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, "background_url"); }} />
                </label>
              </Button>
            </div>
          </div>

          {form.media_type === "video" && (
            <div>
              <Label>URL vidéo (mp4/webm)</Label>
              <div className="flex gap-2">
                <Input value={form.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://..." />
                <Button variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="video/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, "video_url"); }} />
                  </label>
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="fr">
            <TabsList>
              <TabsTrigger value="fr">Français</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>
            {(["fr", "en"] as const).map(lg => (
              <TabsContent key={lg} value={lg} className="space-y-3 mt-3">
                <div><Label>Badge</Label>
                  <Input value={(form as any)[`badge_${lg}`]} onChange={e => set(`badge_${lg}` as any, e.target.value)} /></div>
                <div><Label>Titre — 1ère ligne</Label>
                  <Input value={(form as any)[`title_line1_${lg}`]} onChange={e => set(`title_line1_${lg}` as any, e.target.value)} /></div>
                <div><Label>Titre — mot mis en avant (or)</Label>
                  <Input value={(form as any)[`title_highlight_${lg}`]} onChange={e => set(`title_highlight_${lg}` as any, e.target.value)} /></div>
                <div><Label>Sous-titre</Label>
                  <Textarea rows={2} value={(form as any)[`subtitle_${lg}`]} onChange={e => set(`subtitle_${lg}` as any, e.target.value)} /></div>
                <div><Label>Bouton principal — libellé</Label>
                  <Input value={(form as any)[`cta_primary_label_${lg}`]} onChange={e => set(`cta_primary_label_${lg}` as any, e.target.value)} /></div>
                <div><Label>Bouton secondaire — libellé</Label>
                  <Input value={(form as any)[`cta_secondary_label_${lg}`]} onChange={e => set(`cta_secondary_label_${lg}` as any, e.target.value)} /></div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Lien bouton principal</Label>
              <Input value={form.cta_primary_link} onChange={e => set("cta_primary_link", e.target.value)} /></div>
            <div><Label>Lien bouton secondaire</Label>
              <Input value={form.cta_secondary_link} onChange={e => set("cta_secondary_link", e.target.value)} /></div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" /> Aperçu
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={previewLang === "fr" ? "default" : "outline"} onClick={() => setPreviewLang("fr")}>FR</Button>
              <Button size="sm" variant={previewLang === "en" ? "default" : "outline"} onClick={() => setPreviewLang("en")}>EN</Button>
            </div>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-noir">
            {form.media_type === "video" && form.video_url ? (
              <video src={form.video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
            ) : form.background_url ? (
              <img src={form.background_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-noir/90 via-noir/50 to-noir" />
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
              {previewBadge && (
                <span className="inline-block px-3 py-1 mb-3 text-xs rounded-full bg-primary/20 text-primary border border-primary/30">
                  {previewBadge}
                </span>
              )}
              <h1 className="font-display text-2xl md:text-4xl font-semibold text-cream leading-tight">
                {previewTitleLine1}
                {previewHighlight && (<><br /><span className="text-gradient-gold">{previewHighlight}</span></>)}
              </h1>
              {previewSubtitle && <p className="text-cream/70 mt-2 text-sm max-w-md">{previewSubtitle}</p>}
              <div className="flex gap-2 mt-4">
                {previewCta1 && <span className="px-4 py-2 rounded-full bg-gradient-gold text-noir text-xs font-semibold">{previewCta1}</span>}
                {previewCta2 && <span className="px-4 py-2 rounded-full border border-cream/20 text-cream text-xs">{previewCta2}</span>}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Aperçu simplifié. Le rendu final inclut animations et parallaxe.</p>
        </div>
      </div>
    </div>
  );
}