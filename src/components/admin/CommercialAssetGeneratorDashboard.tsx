import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3,
  Clipboard,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Megaphone,
  QrCode,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const db = supabase as any;

type AssetTemplate = {
  id: string;
  template_type: string;
  title: string;
  description: string | null;
  occasion: string;
  target_audience: string;
  default_tone: string;
  allowed_export_formats: string[];
  is_official: boolean;
};

type GeneratedAsset = {
  id: string;
  template_id: string | null;
  asset_type: string;
  title: string;
  brief: string | null;
  content_text: string;
  personalization: Record<string, unknown>;
  recommended_products: Array<Record<string, unknown>>;
  official_image_urls: string[];
  export_formats: string[];
  share_count: number;
  click_count: number;
  conversion_count: number;
  created_at: string;
  exports: Array<Record<string, unknown>> | null;
};

type ReportRow = {
  owner_id: string;
  generated_total: number;
  generated_7d: number;
  shares_total: number;
  clicks_total: number;
  conversions_total: number;
  conversion_rate: number | null;
  last_generated_at: string | null;
};

const assetTypeLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  story: "Story",
  product_sheet: "Fiche produit",
  pdf_catalog: "Catalogue PDF",
  flyer: "Flyer",
  poster_a4: "Affiche A4",
  business_offer: "Offre entreprise",
  quote: "Devis",
  digital_business_card: "Carte digitale",
  mini_shop_qr: "QR mini-boutique",
  campaign_page: "Page campagne",
};

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Jamais";

const getPersonalization = (asset: GeneratedAsset | null, key: string) => {
  const value = asset?.personalization?.[key];
  return typeof value === "string" ? value : "";
};

const productName = (product: Record<string, unknown>) => (typeof product.name === "string" ? product.name : "Produit LPB");
const productUrl = (product: Record<string, unknown>) => (typeof product.product_url === "string" ? product.product_url : "");
const productImage = (product: Record<string, unknown>) => (typeof product.image_url === "string" ? product.image_url : "");

export default function CommercialAssetGeneratorDashboard() {
  const [templates, setTemplates] = useState<AssetTemplate[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assetType, setAssetType] = useState("whatsapp");
  const [brief, setBrief] = useState("");
  const [productIds, setProductIds] = useState("");

  const load = async () => {
    setLoading(true);
    const [templatesRes, assetsRes, reportRes] = await Promise.all([
      db.from("advisor_commercial_asset_template_library").select("*").order("is_official", { ascending: false }).order("template_type"),
      db.from("advisor_commercial_asset_dashboard").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("admin_commercial_asset_report").select("*").limit(100),
    ]);

    if (templatesRes.error) {
      toast({ title: "Modeles indisponibles", description: templatesRes.error.message, variant: "destructive" });
    } else {
      const data = (templatesRes.data || []) as AssetTemplate[];
      setTemplates(data);
      if (!selectedTemplateId && data[0]) {
        setSelectedTemplateId(data[0].id);
        setAssetType(data[0].template_type);
      }
    }

    if (assetsRes.error) {
      toast({ title: "Supports indisponibles", description: assetsRes.error.message, variant: "destructive" });
    } else {
      setAssets(
        (assetsRes.data || []).map((asset: any) => ({
          ...asset,
          recommended_products: asArray<Record<string, unknown>>(asset.recommended_products),
          official_image_urls: asArray<string>(asset.official_image_urls),
          export_formats: asArray<string>(asset.export_formats),
          exports: asArray<Record<string, unknown>>(asset.exports),
        })),
      );
    }

    if (!reportRes.error) setReport((reportRes.data || []) as ReportRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;
  const latestAsset = assets[0] || null;
  const totalShares = assets.reduce((sum, asset) => sum + Number(asset.share_count || 0), 0);
  const totalClicks = assets.reduce((sum, asset) => sum + Number(asset.click_count || 0), 0);
  const totalConversions = assets.reduce((sum, asset) => sum + Number(asset.conversion_count || 0), 0);

  const productIdArray = useMemo(
    () =>
      productIds
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [productIds],
  );

  const generateAsset = async () => {
    if (!selectedTemplateId) {
      toast({ title: "Modele manquant", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const { error } = await db.rpc("generate_commercial_asset", {
      _template_id: selectedTemplateId,
      _asset_type: assetType,
      _brief: brief || null,
      _product_ids: productIdArray,
    });
    setGenerating(false);

    if (error) {
      toast({ title: "Generation impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Support genere", description: "Le contenu est pret a etre adapte, copie ou exporte." });
    setBrief("");
    void load();
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copie dans le presse-papiers" });
  };

  const requestExport = async (asset: GeneratedAsset, format: string) => {
    const { error } = await db.rpc("request_commercial_asset_export", {
      _generation_id: asset.id,
      _export_format: format,
    });

    if (error) {
      toast({ title: "Export impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Export ${format.toUpperCase()} demande`, description: "La demande est tracee pour le moteur visuel." });
    void load();
  };

  const recordShare = async (asset: GeneratedAsset, channel: string) => {
    await db.rpc("record_commercial_asset_event", {
      _generation_id: asset.id,
      _event_type: "shared",
      _channel: channel,
      _metadata: { source: "commercial_asset_generator_dashboard" },
    });
    toast({ title: "Partage enregistre" });
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gold/20 bg-noir/40 text-cream">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Chargement du generateur commercial...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-playfair text-3xl text-gold">P1.5 Commercial Asset Generator IA</h2>
          <p className="text-muted-foreground">
            Cree des supports commerciaux personnalises pour WhatsApp, email, reseaux sociaux, PDF, flyers et QR mini-boutique.
          </p>
        </div>
        <Button onClick={load} variant="outline" className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Supports generes" value={assets.length.toString()} icon={FileText} />
        <MetricCard title="Partages" value={totalShares.toString()} icon={Share2} />
        <MetricCard title="Clics" value={totalClicks.toString()} icon={BarChart3} />
        <MetricCard title="Conversions" value={totalConversions.toString()} icon={Sparkles} />
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="border border-gold/20 bg-noir/70">
          <TabsTrigger value="generate">Generer</TabsTrigger>
          <TabsTrigger value="library">Bibliotheque</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-gold/20 bg-noir/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Megaphone className="h-5 w-5 text-gold" />
                Nouveau support
              </CardTitle>
              <CardDescription>Choisis un modele, ajoute un brief et genere un support pret a adapter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modele</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(value) => {
                    setSelectedTemplateId(value);
                    const template = templates.find((item) => item.id === value);
                    if (template) setAssetType(template.template_type);
                  }}
                >
                  <SelectTrigger className="border-gold/20 bg-noir/40">
                    <SelectValue placeholder="Selectionner un modele" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {assetTypeLabels[template.template_type] || template.template_type} - {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="rounded-lg border border-gold/10 bg-black/20 p-3 text-sm text-muted-foreground">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge className="bg-gold/15 text-gold">{selectedTemplate.occasion}</Badge>
                    <Badge variant="outline">{selectedTemplate.target_audience}</Badge>
                    {selectedTemplate.is_official && <Badge variant="outline">Officiel LPB</Badge>}
                  </div>
                  {selectedTemplate.description}
                </div>
              )}

              <div className="space-y-2">
                <Label>Brief commercial</Label>
                <Textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Exemple : offre week-end pour champagne, cible couples et cadeaux, livraison Yaounde..."
                  className="min-h-[150px] border-gold/20 bg-noir/40"
                />
              </div>

              <div className="space-y-2">
                <Label>Produits precis optionnels</Label>
                <Input
                  value={productIds}
                  onChange={(event) => setProductIds(event.target.value)}
                  placeholder="UUID produit 1, UUID produit 2..."
                  className="border-gold/20 bg-noir/40"
                />
                <p className="text-xs text-muted-foreground">Vide = le module prend des produits actifs avec images officielles.</p>
              </div>

              <Button onClick={generateAsset} disabled={generating} className="w-full bg-gold text-noir hover:bg-gold/90">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Generer le support
              </Button>
            </CardContent>
          </Card>

          <AssetPreview asset={latestAsset} onCopy={copy} onExport={requestExport} onShare={recordShare} />
        </TabsContent>

        <TabsContent value="library">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="border-gold/20 bg-noir/70">
                <CardHeader>
                  <CardTitle className="text-base text-cream">{asset.title}</CardTitle>
                  <CardDescription>
                    {assetTypeLabels[asset.asset_type] || asset.asset_type} · {formatDate(asset.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-5 whitespace-pre-line text-sm text-muted-foreground">{asset.content_text}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(asset.content_text)}>
                      <Clipboard className="mr-2 h-4 w-4" />
                      Copier
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recordShare(asset, asset.asset_type)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Partage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="border-gold/20 bg-noir/70">
            <CardHeader>
              <CardTitle className="text-cream">Pilotage des supports</CardTitle>
              <CardDescription>Vue admin agregée des creations et performances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.map((row) => (
                <div key={row.owner_id} className="grid gap-3 rounded-lg border border-gold/10 bg-black/20 p-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Createur</p>
                    <p className="font-medium text-cream">{row.owner_id.slice(0, 8)}...</p>
                  </div>
                  <MetricLine label="Generes" value={row.generated_total} />
                  <MetricLine label="7 jours" value={row.generated_7d} />
                  <MetricLine label="Partages" value={row.shares_total} />
                  <MetricLine label="Conversions" value={row.conversions_total} />
                </div>
              ))}
              {!report.length && <p className="text-sm text-muted-foreground">Aucune statistique globale disponible.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssetPreview({
  asset,
  onCopy,
  onExport,
  onShare,
}: {
  asset: GeneratedAsset | null;
  onCopy: (value: string) => void;
  onExport: (asset: GeneratedAsset, format: string) => void;
  onShare: (asset: GeneratedAsset, channel: string) => void;
}) {
  if (!asset) {
    return (
      <Card className="border-gold/20 bg-noir/70">
        <CardHeader>
          <CardTitle className="text-cream">Apercu</CardTitle>
          <CardDescription>Le support genere apparaitra ici.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[360px] items-center justify-center text-muted-foreground">
          <ImageIcon className="mr-2 h-5 w-5 text-gold" />
          Aucun support genere.
        </CardContent>
      </Card>
    );
  }

  const miniShopLink = getPersonalization(asset, "mini_shop_link");

  return (
    <Card className="border-gold/20 bg-noir/70">
      <CardHeader>
        <CardTitle className="text-cream">{asset.title}</CardTitle>
        <CardDescription>
          {assetTypeLabels[asset.asset_type] || asset.asset_type} · {formatDate(asset.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-black to-gold/10 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-playfair text-2xl text-gold">La Petite Bouteille</p>
              <p className="text-sm text-muted-foreground">{getPersonalization(asset, "advisor_name")}</p>
            </div>
            {miniShopLink && (
              <div className="rounded bg-white p-2">
                <QRCodeSVG value={miniShopLink} size={82} />
              </div>
            )}
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-cream">{asset.content_text}</p>
        </div>

        {asset.recommended_products.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {asset.recommended_products.slice(0, 4).map((product, index) => (
              <div key={`${productName(product)}-${index}`} className="rounded-lg border border-gold/10 bg-black/20 p-3">
                {productImage(product) && (
                  <img src={productImage(product)} alt={productName(product)} className="mb-3 h-28 w-full rounded bg-white object-contain" />
                )}
                <p className="font-medium text-cream">{productName(product)}</p>
                {productUrl(product) && <p className="mt-1 truncate text-xs text-gold">{productUrl(product)}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(asset.content_text)}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copier texte
          </Button>
          <Button size="sm" variant="outline" onClick={() => onShare(asset, asset.asset_type)}>
            <Share2 className="mr-2 h-4 w-4" />
            Marquer partage
          </Button>
          {asset.export_formats.map((format) => (
            <Button key={format} size="sm" variant="outline" onClick={() => onExport(asset, format)}>
              {format === "pdf" ? <FileText className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
              {format.toUpperCase()}
            </Button>
          ))}
        </div>

        <div className="rounded-lg border border-gold/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cream">
            <QrCode className="h-4 w-4 text-gold" />
            Personnalisation
          </div>
          <p className="text-sm text-muted-foreground">Lien ambassadeur : {getPersonalization(asset, "referral_link") || "Non disponible"}</p>
          <p className="text-sm text-muted-foreground">Mini-boutique : {miniShopLink || "Non disponible"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="border-gold/20 bg-noir/70">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold text-cream">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-gold" />
      </CardContent>
    </Card>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-cream">{value}</p>
    </div>
  );
}
