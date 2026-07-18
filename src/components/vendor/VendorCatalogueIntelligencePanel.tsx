import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { VendorProduct, VendorShop } from "@/hooks/useVendorShop";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QualitySnapshot = {
  product_id: string;
  product_name: string | null;
  product_slug: string | null;
  catalogue_quality_score: number;
  completeness_score: number;
  attribute_score: number;
  brand_score: number;
  category_score: number;
  image_score: number;
  seo_score: number;
  missing_attributes: string[];
  normalization_issues: string[];
  analyzed_at: string;
};

type Proposal = {
  id: string;
  product_id: string;
  product_name: string | null;
  proposal_type: string;
  current_value: unknown;
  proposed_value: unknown;
  confidence_score: number;
  status: string;
  explanation: string | null;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const formatScore = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined) return "Non renseigné";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export default function VendorCatalogueIntelligencePanel({ shop, products }: { shop: VendorShop; products: VendorProduct[] }) {
  const [quality, setQuality] = useState<QualitySnapshot[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const averageScore = useMemo(() => {
    if (quality.length === 0) return 0;
    return quality.reduce((sum, item) => sum + Number(item.catalogue_quality_score || 0), 0) / quality.length;
  }, [quality]);

  const productsWithoutScore = useMemo(
    () => products.filter((product) => !quality.some((item) => item.product_id === product.id)),
    [products, quality],
  );

  const loadData = async () => {
    setIsLoading(true);
    const [qualityResult, proposalsResult] = await Promise.all([
      db.from("my_catalogue_quality_latest").select("*").order("catalogue_quality_score", { ascending: true }).limit(120),
      db.from("my_catalogue_enrichment_proposals").select("*").order("created_at", { ascending: false }).limit(120),
    ]);

    if (!qualityResult.error) setQuality(toArray<QualitySnapshot>(qualityResult.data));
    if (!proposalsResult.error) setProposals(toArray<Proposal>(proposalsResult.data));
    if (qualityResult.error) {
      toast({ title: "Catalogue IA indisponible", description: qualityResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [shop.id]);

  const analyzeProduct = async (productId = selectedProductId) => {
    if (!productId) {
      toast({ title: "Produit requis", description: "Choisis une fiche à analyser." });
      return;
    }
    setIsWorking(true);
    const { error } = await db.rpc("analyze_catalogue_product", { _product_id: productId });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Analyse terminée", description: "Le score qualité catalogue a été recalculé." });
    await loadData();
  };

  const reviewProposal = async (id: string, status: "approved" | "rejected" | "archived") => {
    const { error } = await db.rpc("update_catalogue_enrichment_proposal_status", {
      _proposal_id: id,
      _status: status,
      _explanation: "Décision vendeur depuis Catalogue IA",
    });
    if (error) {
      toast({ title: "Décision impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Proposition mise à jour" });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/50">
        <CardContent className="flex min-h-[220px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Catalogue IA...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="text-cream">Catalogue Intelligence</CardTitle>
          <CardDescription>
            Analyse la qualité de vos fiches Marketplace, les informations manquantes et les propositions de normalisation. Rien n'est publié automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Score moyen" value={`${formatScore(averageScore)}%`} />
            <Metric label="Fiches analysées" value={`${quality.length}`} />
            <Metric label="À analyser" value={`${productsWithoutScore.length}`} />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => analyzeProduct()} disabled={isWorking || !selectedProductId} className="bg-gradient-gold text-noir">
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser
            </Button>
            <Button variant="outline" onClick={loadData} className="border-gold/30">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="proposals">Propositions</TabsTrigger>
          <TabsTrigger value="missing">À analyser</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-3">
          {quality.length === 0 ? <EmptyState text="Lance une première analyse pour obtenir les scores." /> : quality.map((item) => (
            <Card key={item.product_id} className="border-gold/10 bg-noir/40">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_280px_auto] md:items-center">
                <div>
                  <div className="font-medium text-cream">{item.product_name || item.product_id}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.missing_attributes.length} champs manquants - {item.normalization_issues.length} alertes de normalisation
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.missing_attributes.slice(0, 4).map((missing) => <Badge key={missing} variant="outline">{missing}</Badge>)}
                    {item.normalization_issues.slice(0, 3).map((issue) => <Badge key={issue} variant="outline">{issue}</Badge>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <MiniScore label="Completude" value={item.completeness_score} />
                  <MiniScore label="Marque" value={item.brand_score} />
                  <MiniScore label="Image" value={item.image_score} />
                  <MiniScore label="SEO" value={item.seo_score} />
                </div>
                <Badge variant={Number(item.catalogue_quality_score || 0) >= 80 ? "default" : "outline"}>
                  {formatScore(item.catalogue_quality_score)}%
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="proposals" className="space-y-3">
          {proposals.length === 0 ? <EmptyState text="Aucune proposition en attente." /> : proposals.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/40">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-cream">{item.product_name || item.product_id}</div>
                    <div className="text-sm text-muted-foreground">{item.proposal_type} - confiance {formatScore(item.confidence_score)}%</div>
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
                    <Button size="sm" onClick={() => reviewProposal(item.id, "approved")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approuver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reviewProposal(item.id, "rejected")}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => reviewProposal(item.id, "archived")}>Archiver</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="missing" className="grid gap-3 md:grid-cols-2">
          {productsWithoutScore.length === 0 ? <EmptyState text="Toutes les fiches visibles ont déjà un score." /> : productsWithoutScore.map((product) => (
            <Card key={product.id} className="border-gold/10 bg-noir/40">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-cream">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.stock_quantity ?? 0} en stock</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => analyzeProduct(product.id)} disabled={isWorking}>
                  Analyser
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-bold text-cream">{value}</div>
  </div>
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

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-muted-foreground">{text}</div>
);
