import { useEffect, useMemo, useState } from "react";
import { Eye, Film, Image as ImageIcon, Loader2, Rocket, Save, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useHeroConfig, usePublishHero, useSaveHeroDraft, type HeroData } from "@/hooks/useHeroConfig";
import { supabase } from "@/integrations/supabase/client";

const emptyHero: HeroData = {
  media_type: "image",
  background_url: "",
  video_url: "",
  badge_fr: "Cave premium au Cameroun",
  badge_en: "Premium wine shop in Cameroon",
  title_line1_fr: "Vins, champagnes",
  title_line1_en: "Wines, champagnes",
  title_highlight_fr: "et spiritueux",
  title_highlight_en: "and spirits",
  subtitle_fr: "Une selection soignee pour vos cadeaux, diners, evenements et moments d'exception.",
  subtitle_en: "A curated selection for gifts, dinners, events and exceptional moments.",
  cta_primary_label_fr: "Acheter maintenant",
  cta_primary_label_en: "Shop now",
  cta_primary_link: "/catalogue",
  cta_secondary_label_fr: "Voir les champagnes",
  cta_secondary_label_en: "View champagnes",
  cta_secondary_link: "/catalogue/champagnes",
  active_from: "",
  active_until: "",
};

type Locale = "fr" | "en";
type LocalizedPrefix =
  | "badge"
  | "title_line1"
  | "title_highlight"
  | "subtitle"
  | "cta_primary_label"
  | "cta_secondary_label";
type LocalizedHeroKey = `${LocalizedPrefix}_${Locale}` & keyof HeroData;

const localizedKey = (prefix: LocalizedPrefix, locale: Locale): LocalizedHeroKey =>
  `${prefix}_${locale}` as LocalizedHeroKey;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue";

const toDatetimeLocal = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value: string) =>
  value ? new Date(value).toISOString() : "";

const getCampaignStatus = (hero: HeroData) => {
  const now = Date.now();
  const startsAt = hero.active_from ? new Date(hero.active_from).getTime() : null;
  const endsAt = hero.active_until ? new Date(hero.active_until).getTime() : null;

  if (startsAt && Number.isFinite(startsAt) && now < startsAt) return "Programmee";
  if (endsAt && Number.isFinite(endsAt) && now > endsAt) return "Expiree";
  return "Active";
};

const localizedFields: Array<{ label: string; prefix: LocalizedPrefix; multiline?: boolean }> = [
  { label: "Badge", prefix: "badge" },
  { label: "Titre - 1ere ligne", prefix: "title_line1" },
  { label: "Titre - partie mise en avant", prefix: "title_highlight" },
  { label: "Sous-titre", prefix: "subtitle", multiline: true },
  { label: "Bouton principal - libelle", prefix: "cta_primary_label" },
  { label: "Bouton secondaire - libelle", prefix: "cta_secondary_label" },
];

export function HeroConfigManager() {
  const { data: config, isLoading } = useHeroConfig();
  const saveDraft = useSaveHeroDraft();
  const publish = usePublishHero();

  const [form, setForm] = useState<HeroData>(emptyHero);
  const [uploading, setUploading] = useState(false);
  const [previewLang, setPreviewLang] = useState<Locale>("fr");

  useEffect(() => {
    if (!config) return;
    setForm({
      ...emptyHero,
      ...(config.published as Partial<HeroData> | undefined),
      ...(config.draft as Partial<HeroData> | undefined),
    });
  }, [config]);

  const set = <K extends keyof HeroData>(key: K, value: HeroData[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const upload = async (file: File, field: "background_url" | "video_url") => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `hero/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      set(field, data.publicUrl);
      toast({ title: "Media televerse" });
    } catch (error) {
      toast({ title: "Erreur", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync(form);
      toast({ title: "Brouillon enregistre" });
    } catch (error) {
      toast({ title: "Erreur", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const onPublish = async () => {
    if (!confirm("Publier ce hero en production ?")) return;
    try {
      await publish.mutateAsync(form);
      toast({ title: "Hero publie" });
    } catch (error) {
      toast({ title: "Erreur", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const onRevert = () => {
    if (!config?.published) return;
    setForm({ ...emptyHero, ...(config.published as Partial<HeroData>) });
    toast({ title: "Brouillon abandonne" });
  };

  const hasDraft = useMemo(() => config?.draft && Object.keys(config.draft).length > 0, [config]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const previewTitleLine1 = form[localizedKey("title_line1", previewLang)];
  const previewHighlight = form[localizedKey("title_highlight", previewLang)];
  const previewSubtitle = form[localizedKey("subtitle", previewLang)];
  const previewBadge = form[localizedKey("badge", previewLang)];
  const previewCta1 = form[localizedKey("cta_primary_label", previewLang)];
  const previewCta2 = form[localizedKey("cta_secondary_label", previewLang)];
  const campaignStatus = getCampaignStatus(form);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">Hero d'accueil</h2>
          <p className="text-sm text-muted-foreground">
            {hasDraft ? "Brouillon non publie en cours." : "Aucun brouillon."} Statut apercu: {campaignStatus}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onRevert}>
            <Undo2 className="mr-2 h-4 w-4" />
            Reinitialiser
          </Button>
          <Button variant="outline" onClick={onSaveDraft} disabled={saveDraft.isPending}>
            {saveDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauver brouillon
          </Button>
          <Button onClick={onPublish} disabled={publish.isPending}>
            {publish.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Publier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <Label>Type de media</Label>
            <div className="mt-1 flex gap-2">
              <Button size="sm" variant={form.media_type === "image" ? "default" : "outline"} onClick={() => set("media_type", "image")}>
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </Button>
              <Button size="sm" variant={form.media_type === "video" ? "default" : "outline"} onClick={() => set("media_type", "video")}>
                <Film className="mr-2 h-4 w-4" />
                Video
              </Button>
            </div>
          </div>

          <div>
            <Label>Image de fond / affiche publicitaire</Label>
            <div className="flex gap-2">
              <Input value={form.background_url} onChange={(event) => set("background_url", event.target.value)} placeholder="https://..." />
              <Button variant="outline" asChild disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload(file, "background_url");
                    }}
                  />
                </label>
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Recommandation: image horizontale 1920x900 minimum. Placez le produit ou l'affiche au centre pour garder un bon cadrage mobile.
            </p>
          </div>

          {form.media_type === "video" && (
            <div>
              <Label>URL video (mp4/webm)</Label>
              <div className="flex gap-2">
                <Input value={form.video_url} onChange={(event) => set("video_url", event.target.value)} placeholder="https://..." />
                <Button variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) upload(file, "video_url");
                      }}
                    />
                  </label>
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="fr">
            <TabsList>
              <TabsTrigger value="fr">Francais</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>
            {(["fr", "en"] as const).map((locale) => (
              <TabsContent key={locale} value={locale} className="mt-3 space-y-3">
                {localizedFields.map((field) => {
                  const key = localizedKey(field.prefix, locale);
                  return (
                    <div key={key}>
                      <Label>{field.label}</Label>
                      {field.multiline ? (
                        <Textarea rows={2} value={form[key]} onChange={(event) => set(key, event.target.value)} />
                      ) : (
                        <Input value={form[key]} onChange={(event) => set(key, event.target.value)} />
                      )}
                    </div>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Lien bouton principal</Label>
              <Input value={form.cta_primary_link} onChange={(event) => set("cta_primary_link", event.target.value)} />
            </div>
            <div>
              <Label>Lien bouton secondaire</Label>
              <Input value={form.cta_secondary_link} onChange={(event) => set("cta_secondary_link", event.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3">
              <Label>Programmation de la campagne</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Laissez les dates vides pour afficher la campagne en permanence. Une campagne future ou expiree retombe automatiquement sur le hero par defaut.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="hero-active-from">Debut</Label>
                <Input
                  id="hero-active-from"
                  type="datetime-local"
                  value={toDatetimeLocal(form.active_from)}
                  onChange={(event) => set("active_from", fromDatetimeLocal(event.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="hero-active-until">Fin</Label>
                <Input
                  id="hero-active-until"
                  type="datetime-local"
                  value={toDatetimeLocal(form.active_until)}
                  onChange={(event) => set("active_until", fromDatetimeLocal(event.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Apercu
              <span className="rounded-full border border-primary/25 px-2 py-0.5 text-xs text-primary">
                {campaignStatus}
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={previewLang === "fr" ? "default" : "outline"} onClick={() => setPreviewLang("fr")}>FR</Button>
              <Button size="sm" variant={previewLang === "en" ? "default" : "outline"} onClick={() => setPreviewLang("en")}>EN</Button>
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-noir">
            {form.media_type === "video" && form.video_url ? (
              <video src={form.video_url} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
            ) : form.background_url ? (
              <img src={form.background_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-noir/90 via-noir/50 to-noir" />
            <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
              {previewBadge && (
                <span className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs text-primary">
                  {previewBadge}
                </span>
              )}
              <h1 className="font-display text-2xl font-semibold leading-tight text-cream md:text-4xl">
                {previewTitleLine1}
                {previewHighlight && (
                  <>
                    <br />
                    <span className="text-gradient-gold">{previewHighlight}</span>
                  </>
                )}
              </h1>
              {previewSubtitle && <p className="mt-2 max-w-md text-sm text-cream/70">{previewSubtitle}</p>}
              <div className="mt-4 flex gap-2">
                {previewCta1 && <span className="rounded-full bg-gradient-gold px-4 py-2 text-xs font-semibold text-noir">{previewCta1}</span>}
                {previewCta2 && <span className="rounded-full border border-cream/20 px-4 py-2 text-xs text-cream">{previewCta2}</span>}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Apercu simplifie. Pour une campagne produit, gardez un titre court et utilisez le bouton principal vers la fiche produit ou la categorie.
          </p>
        </div>
      </div>
    </div>
  );
}
