import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BadgeCheck, Database, GitCompareArrows, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type CatalogueOverview = {
  vendor_shop_id: string;
  shop_name: string | null;
  product_count: number;
  avg_catalogue_quality_score: number;
  avg_completeness_score: number;
  avg_image_score: number;
  avg_seo_score: number;
  products_below_70: number;
  pending_proposals: number;
  duplicate_candidates: number;
  last_analyzed_at: string | null;
};

type Proposal = {
  id: string;
  product_id: string;
  product_name: string | null;
  shop_name: string | null;
  proposal_type: string;
  current_value: unknown;
  proposed_value: unknown;
  confidence_score: number;
  status: string;
  explanation: string | null;
  created_at: string;
};

type DuplicateCandidate = {
  id: string;
  product_name: string | null;
  candidate_product_name: string | null;
  shop_name: string | null;
  confidence_score: number;
  signals: string[];
  status: string;
  created_at: string;
};

type ReferenceRow = {
  id: string;
  code?: string;
  label?: string;
  canonical_name?: string;
  normalized_name?: string;
  slug?: string;
  is_active?: boolean;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const formatScore = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined) return "Non renseigné";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export default function CatalogueIntelligenceDashboard() {
  const [overview, setOverview] = useState<CatalogueOverview[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [attributes, setAttributes] = useState<ReferenceRow[]>([]);
  const [brands, setBrands] = useState<ReferenceRow[]>([]);
  const [taxonomy, setTaxonomy] = useState<ReferenceRow[]>([]);
  const [productId, setProductId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const globalQuality = useMemo(() => {
    if (overview.length === 0) return 0;
    return overview.reduce((sum, item) => sum + Number(item.avg_catalogue_quality_score || 0), 0) / overview.length;
  }, [overview]);

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, proposalsResult, duplicatesResult, attributesResult, brandsResult, taxonomyResult] = await Promise.all([
      db.from("admin_catalogue_intelligence_overview").select("*").order("avg_catalogue_quality_score", { ascending: true }).limit(100),
      db.from("my_catalogue_enrichment_proposals").select("*").order("created_at", { ascending: false }).limit(120),
      db.from("admin_catalogue_duplicate_candidates").select("*").order("confidence_score", { ascending: false }).limit(120),
      db.from("catalogue_attribute_definitions").select("*").order("code", { ascending: true }).limit(120),
      db.from("catalogue_brand_references").select("*").order("canonical_name", { ascending: true }).limit(120),
      db.from("catalogue_category_taxonomy").select("*").order("label", { ascending: true }).limit(120),
    ]);

    if (!overviewResult.error) setOverview(toArray<CatalogueOverview>(overviewResult.data));
    if (!proposalsResult.error) setProposals(toArray<Proposal>(proposalsResult.data));
    if (!duplicatesResult.error) setDuplicates(toArray<DuplicateCandidate>(duplicatesResult.data));
    if (!attributesResult.error) setAttributes(toArray<ReferenceRow>(attributesResult.data));
    if (!brandsResult.error) setBrands(toArray<ReferenceRow>(brandsResult.data));
    if (!taxonomyResult.error) setTaxonomy(toArray<ReferenceRow>(taxonomyResult.data));

    if (overviewResult.error) {
      toast({ title: "Catalogue Intelligence indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const analyzeProduct = async () => {
    if (!productId.trim()) {
      toast({ title: "Produit requis", description: "Renseigne l'UUID d'un produit Marketplace." });
      return;
    }
    setIsWorking(true);
    const { error } = await db.rpc("analyze_catalogue_product", { _product_id: productId.trim() });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse catalogue impossible", description: error.message, variant: "destructive" });
      return;
    }
    setProductId("");
    toast({ title: "Produit analysé", description: "Le score catalogue, les doublons et propositions ont été recalculés." });
    await loadData();
  };

  const reviewProposal = async (id: string, status: "approved" | "rejected" | "archived") => {
    const { error } = await db.rpc("update_catalogue_enrichment_proposal_status", {
      _proposal_id: id,
      _status: status,
      _explanation: "Décision depuis la console Catalogue Intelligence",
    });
    if (error) {
      toast({ title: "Décision impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Proposition mise à jour" });
    await loadData();
  };

  const reviewDuplicate = async (id: string, status: "confirmed_duplicate" | "not_duplicate" | "archived") => {
    const { error } = await db.rpc("update_catalogue_duplicate_candidate_status", {
      _candidate_id: id,
      _status: status,
      _explanation: "Décision admin depuis Catalogue Intelligence",
    });
    if (error) {
      toast({ title: "Décision doublon impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Doublon mis à jour" });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Catalogue Intelligence Engine...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P2.4 Catalogue Intelligence Engine</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Normalisation des fiches Marketplace, détection des doublons, référentiels marques/attributs et qualité catalogue. Aucun impact financier P0.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="Qualité catalogue moyenne" value={globalQuality} />
        <MetricCard label="Boutiques analysées" value={overview.length} icon={<Database className="h-5 w-5" />} />
        <MetricCard label="Fiches sous 70%" value={overview.reduce((sum, item) => sum + Number(item.products_below_70 || 0), 0)} icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard label="Doublons candidats" value={duplicates.filter((item) => item.status === "candidate").length} icon={<GitCompareArrows className="h-5 w-5" />} />
      </div>

      <Card className="border-gold/20 bg-noir/60">
        <CardHeader>
          <CardTitle className="text-cream">Analyse rapide produit</CardTitle>
          <CardDescription>Calcule la qualité catalogue et propose des enrichissements sans modifier la fiche publiée.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="UUID produit Marketplace" />
          <Button onClick={analyzeProduct} disabled={isWorking || !productId.trim()} className="bg-gradient-gold text-noir">
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="overview">Vue globale</TabsTrigger>
          <TabsTrigger value="proposals">Propositions</TabsTrigger>
          <TabsTrigger value="duplicates">Doublons</TabsTrigger>
          <TabsTrigger value="refs">Référentiels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          {overview.length === 0 ? <EmptyState text="Aucune boutique analysée pour le moment." /> : overview.map((item) => (
            <Card key={item.vendor_shop_id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_280px_180px] md:items-center">
                <div>
                  <div className="font-medium text-cream">{item.shop_name || item.vendor_shop_id}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.product_count} produits - {item.products_below_70} fiches sous 70% - {item.pending_proposals} propositions ouvertes
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Dernière analyse : {item.last_analyzed_at ? new Date(item.last_analyzed_at).toLocaleString("fr-FR") : "jamais"}</div>
                </div>
                <div className="space-y-2">
                  <MiniScore label="Completude" value={item.avg_completeness_score} />
                  <MiniScore label="Images" value={item.avg_image_score} />
                  <MiniScore label="SEO" value={item.avg_seo_score} />
                </div>
                <Badge variant={Number(item.avg_catalogue_quality_score || 0) >= 80 ? "default" : "outline"}>
                  Score {formatScore(item.avg_catalogue_quality_score)}%
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-3">
          {proposals.length === 0 ? <EmptyState text="Aucune proposition d'enrichissement." /> : proposals.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/50">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-cream">{item.product_name || item.product_id}</div>
                    <div className="text-sm text-muted-foreground">{item.shop_name} - {item.proposal_type} - confiance {formatScore(item.confidence_score)}%</div>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <ValueBlock label="Actuel" value={stringifyValue(item.current_value)} />
                  <ValueBlock label="Proposé" value={stringifyValue(item.proposed_value)} />
                </div>
                {item.explanation && <p className="text-sm text-muted-foreground">{item.explanation}</p>}
                {item.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => reviewProposal(item.id, "approved")}>Approuver</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewProposal(item.id, "rejected")}>Rejeter</Button>
                    <Button size="sm" variant="ghost" onClick={() => reviewProposal(item.id, "archived")}>Archiver</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-3">
          {duplicates.length === 0 ? <EmptyState text="Aucun doublon candidat." /> : duplicates.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_160px_260px] md:items-center">
                <div>
                  <div className="font-medium text-cream">{item.product_name}</div>
                  <div className="text-sm text-muted-foreground">Candidat : {item.candidate_product_name} - {item.shop_name}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.signals.map((signal) => <Badge key={signal} variant="outline">{signal}</Badge>)}
                  </div>
                </div>
                <Badge variant="outline">{formatScore(item.confidence_score)}% - {item.status}</Badge>
                {item.status === "candidate" && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => reviewDuplicate(item.id, "confirmed_duplicate")}>Confirmer</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewDuplicate(item.id, "not_duplicate")}>Pas doublon</Button>
                    <Button size="sm" variant="ghost" onClick={() => reviewDuplicate(item.id, "archived")}>Archiver</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="refs">
          <div className="grid gap-4 lg:grid-cols-3">
            <ReferenceList title="Attributs officiels" rows={attributes} display={(row) => row.code || row.label || row.id} />
            <ReferenceList title="Marques normalisées" rows={brands} display={(row) => row.canonical_name || row.normalized_name || row.id} />
            <ReferenceList title="Taxonomie" rows={taxonomy} display={(row) => row.label || row.slug || row.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: ReactNode }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-bold text-cream">{value.toLocaleString("fr-FR")}</div>
      </div>
      <div className="rounded-full bg-gold/10 p-3 text-primary">{icon}</div>
    </CardContent>
  </Card>
);

const ScoreCard = ({ label, value }: { label: string; value: number }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <BadgeCheck className="h-5 w-5 text-primary" />
      </div>
      <div className="text-2xl font-bold text-cream">{formatScore(value)}%</div>
      <Progress value={Math.max(0, Math.min(100, value))} className="h-2" />
    </CardContent>
  </Card>
);

const MiniScore = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{formatScore(value)}%</span>
    </div>
    <Progress value={Math.max(0, Math.min(100, Number(value || 0)))} className="h-2" />
  </div>
);

const ValueBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/50 p-3">
    <div className="mb-1 text-xs uppercase tracking-wide text-primary">{label}</div>
    <div className="break-words text-muted-foreground">{value}</div>
  </div>
);

const ReferenceList = ({ title, rows, display }: { title: string; rows: ReferenceRow[]; display: (row: ReferenceRow) => string }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardHeader>
      <CardTitle className="text-cream">{title}</CardTitle>
      <CardDescription>{rows.length} entrées visibles</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {rows.length === 0 ? <EmptyState text="Aucune donnée." /> : rows.slice(0, 12).map((row) => (
        <div key={row.id} className="flex items-center justify-between rounded-lg border border-gold/10 bg-noir/40 px-3 py-2">
          <span className="text-sm text-cream">{display(row)}</span>
          <Badge variant="outline">{row.is_active === false ? "inactif" : "actif"}</Badge>
        </div>
      ))}
    </CardContent>
  </Card>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-muted-foreground">{text}</div>
);
