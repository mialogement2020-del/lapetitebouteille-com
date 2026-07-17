import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Globe2, Loader2, RefreshCw, Search, Sparkles, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

type RpcClient = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
};
type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: RpcClient;
};

type AdminSeoOverview = {
  vendor_shop_id: string;
  shop_name: string | null;
  vendor_owner_id: string;
  seo_score: number;
  discoverability_score: number;
  product_count: number;
  optimized_product_count: number;
  issues: string[];
  open_proposals: number;
  analyzed_at: string;
};

type AdminSeoIssue = {
  product_id: string;
  product_name: string | null;
  product_slug: string | null;
  shop_name: string | null;
  vendor_shop_id: string;
  seo_score: number;
  discoverability_score: number;
  issues: string[];
  analyzed_at: string;
};

type Synonym = {
  id: string;
  canonical_term: string;
  synonyms: string[];
  scope: string;
  language: string;
  is_active: boolean;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const formatScore = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function MarketplaceSeoDashboard() {
  const [overview, setOverview] = useState<AdminSeoOverview[]>([]);
  const [issues, setIssues] = useState<AdminSeoIssue[]>([]);
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [shopId, setShopId] = useState("");
  const [productId, setProductId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const globalSeo = useMemo(() => {
    if (overview.length === 0) return 0;
    return overview.reduce((sum, item) => sum + Number(item.seo_score || 0), 0) / overview.length;
  }, [overview]);

  const criticalIssues = useMemo(
    () => issues.filter((item) => Number(item.seo_score || 0) < 60 || item.issues.length > 1),
    [issues],
  );

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, issuesResult, synonymsResult] = await Promise.all([
      db.from("admin_marketplace_seo_overview").select("*").order("seo_score", { ascending: true }).limit(100),
      db.from("admin_marketplace_seo_issues").select("*").order("seo_score", { ascending: true }).limit(120),
      db.from("marketplace_search_synonyms").select("*").order("canonical_term", { ascending: true }).limit(120),
    ]);

    if (!overviewResult.error) setOverview(toArray<AdminSeoOverview>(overviewResult.data));
    if (!issuesResult.error) setIssues(toArray<AdminSeoIssue>(issuesResult.data));
    if (!synonymsResult.error) setSynonyms(toArray<Synonym>(synonymsResult.data));

    if (overviewResult.error) {
      toast({ title: "SEO Marketplace indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const analyzeShop = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_shop_seo", {
      _vendor_shop_id: shopId.trim() || null,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse boutique impossible", description: error.message, variant: "destructive" });
      return;
    }
    setShopId("");
    toast({ title: "Boutique analysée", description: "Le score SEO/Discoverability a été recalculé." });
    await loadData();
  };

  const analyzeProduct = async () => {
    if (!productId.trim()) {
      toast({ title: "Produit requis", description: "Renseigne l'UUID du produit Marketplace." });
      return;
    }
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_product_seo", {
      _product_id: productId.trim(),
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse produit impossible", description: error.message, variant: "destructive" });
      return;
    }
    setProductId("");
    toast({ title: "Produit analysé", description: "Les recommandations SEO sont prêtes pour le vendeur." });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du SEO Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P2.3 SEO & Discoverability Marketplace</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Pilotage des scores SEO, découvrabilité, propositions de contenus, synonymes de recherche et sitemap Marketplace. Aucun impact P0.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="SEO moyen boutiques" value={globalSeo} />
        <MetricCard label="Boutiques analysées" value={overview.length} icon={<Store className="h-5 w-5" />} />
        <MetricCard label="Produits à corriger" value={criticalIssues.length} icon={<AlertTriangle className="h-5 w-5" />} />
        <MetricCard label="Synonymes actifs" value={synonyms.filter((item) => item.is_active).length} icon={<Search className="h-5 w-5" />} />
      </div>

      <Card className="border-gold/20 bg-noir/60">
        <CardHeader>
          <CardTitle className="text-cream">Analyse rapide</CardTitle>
          <CardDescription>Recalcule une boutique ou une fiche Marketplace précise sans publier de modification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <Input value={shopId} onChange={(event) => setShopId(event.target.value)} placeholder="UUID boutique optionnel" />
          <Input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="UUID produit Marketplace" />
          <Button onClick={analyzeShop} disabled={isWorking}>
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe2 className="mr-2 h-4 w-4" />}
            Analyser boutique
          </Button>
          <Button onClick={analyzeProduct} disabled={isWorking || !productId.trim()} className="bg-gradient-gold text-noir">
            <Sparkles className="mr-2 h-4 w-4" />
            Analyser fiche
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="shops" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="shops">Boutiques</TabsTrigger>
          <TabsTrigger value="issues">Fiches à optimiser</TabsTrigger>
          <TabsTrigger value="synonyms">Synonymes</TabsTrigger>
        </TabsList>

        <TabsContent value="shops" className="space-y-3">
          {overview.length === 0 ? (
            <EmptyState text="Aucun score boutique pour le moment." />
          ) : (
            overview.map((item) => (
              <Card key={item.vendor_shop_id} className="border-gold/10 bg-noir/50">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_220px_180px] md:items-center">
                  <div>
                    <div className="font-medium text-cream">{item.shop_name || item.vendor_shop_id}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.product_count} produits publics - {item.optimized_product_count} optimisés - {item.open_proposals} propositions ouvertes
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.issues.slice(0, 3).map((issue) => <Badge key={issue} variant="outline">{issue}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <MiniScore label="SEO" value={item.seo_score} />
                    <MiniScore label="Découvrabilité" value={item.discoverability_score} />
                  </div>
                  <Button variant="outline" onClick={() => setShopId(item.vendor_shop_id)} className="border-gold/30">
                    Copier UUID analyse
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="issues" className="space-y-3">
          {issues.length === 0 ? (
            <EmptyState text="Aucune fiche analysée ou aucun problème remonté." />
          ) : (
            issues.map((item) => (
              <div key={item.product_id} className="rounded-lg border border-gold/10 bg-noir/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-cream">{item.product_name}</div>
                    <div className="text-sm text-muted-foreground">{item.shop_name} - /produit/{item.product_slug}</div>
                  </div>
                  <Badge variant="outline">SEO {formatScore(item.seo_score)}%</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.issues.map((issue) => <Badge key={issue} variant="outline">{issue}</Badge>)}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="synonyms" className="space-y-3">
          {synonyms.length === 0 ? (
            <EmptyState text="Aucun synonyme de recherche configuré." />
          ) : (
            synonyms.map((item) => (
              <div key={item.id} className="rounded-lg border border-gold/10 bg-noir/50 p-4">
                <div className="font-medium text-cream">{item.canonical_term}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.synonyms.join(", ") || "Aucun synonyme"}</div>
                <Badge className="mt-2" variant="outline">{item.scope} - {item.language}</Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ScoreCard = ({ label, value }: { label: string; value: number }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-cream">{formatScore(value)}%</div>
      <Progress value={Math.min(100, Number(value || 0))} className="mt-3 h-2" />
    </CardContent>
  </Card>
);

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: ReactNode }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold text-cream">{value}</div>
      </div>
      <div className="text-primary">{icon}</div>
    </CardContent>
  </Card>
);

const MiniScore = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{formatScore(value)}%</span>
    </div>
    <Progress value={Math.min(100, Number(value || 0))} className="h-1.5" />
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <Card className="border-dashed border-gold/20 bg-noir/40">
    <CardContent className="p-8 text-center text-muted-foreground">{text}</CardContent>
  </Card>
);
