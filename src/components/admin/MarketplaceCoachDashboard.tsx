import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Brain,
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
} from "lucide-react";

type RpcClient = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => QueryBuilder;
  };
  rpc: RpcClient;
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

const db = supabase as unknown as QueryClient;

type CoachSnapshot = {
  vendor_shop_id: string;
  vendor_owner_id: string;
  shop_name?: string | null;
  shop_score: number;
  product_quality_score: number;
  image_quality_score: number;
  seo_score: number;
  completeness_score: number;
  conversion_score: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  products_to_optimize: Array<Record<string, unknown>>;
  performing_products: Array<Record<string, unknown>>;
  low_visibility_products: Array<Record<string, unknown>>;
  metrics: Record<string, unknown>;
  calculated_at: string;
};

type CoachRecommendation = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  product_image_url?: string | null;
  recommendation_type: string;
  priority: string;
  title: string;
  description: string;
  justification: string;
  expected_impact: Record<string, unknown>;
  suggested_action: Record<string, unknown>;
  status: string;
  created_at: string;
};

type ProductAnalysis = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_image_url?: string | null;
  global_score: number;
  title_score: number;
  description_score: number;
  image_score: number;
  seo_score: number;
  completeness_score: number;
  stock_score: number;
  compliance_score: number;
  strengths: string[];
  issues: string[];
  opportunities: string[];
  suggested_title: string | null;
  suggested_description: string | null;
  analyzed_at: string;
};

type AdminOverview = CoachSnapshot & {
  open_recommendations: number;
};

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-gold/10 text-primary border-gold/30",
  low: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const statusTone: Record<string, string> = {
  open: "bg-gold/10 text-primary border-gold/30",
  accepted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  dismissed: "bg-muted text-muted-foreground",
};

const formatScore = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const normalizeArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export default function MarketplaceCoachDashboard() {
  const [snapshot, setSnapshot] = useState<CoachSnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<CoachRecommendation[]>([]);
  const [analyses, setAnalyses] = useState<ProductAnalysis[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverview[]>([]);
  const [productId, setProductId] = useState("");
  const [shopId, setShopId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const metrics = useMemo(() => snapshot?.metrics || {}, [snapshot]);

  const loadData = async () => {
    setIsLoading(true);
    const [dashboardResult, recommendationsResult, analysesResult, adminResult] = await Promise.all([
      db.from("my_marketplace_coach_dashboard").select("*").maybeSingle(),
      db.from("my_marketplace_coach_recommendations").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_coach_product_analyses").select("*").order("analyzed_at", { ascending: false }).limit(80),
      db.from("admin_marketplace_coach_overview").select("*").order("shop_score", { ascending: true }).limit(80),
    ]);

    if (!dashboardResult.error) setSnapshot((dashboardResult.data as CoachSnapshot | null) ?? null);
    if (!recommendationsResult.error) setRecommendations(normalizeArray<CoachRecommendation>(recommendationsResult.data));
    if (!analysesResult.error) setAnalyses(normalizeArray<ProductAnalysis>(analysesResult.data));
    if (!adminResult.error) setAdminOverview(normalizeArray<AdminOverview>(adminResult.data));

    if (dashboardResult.error) {
      toast({ title: "Coach Marketplace indisponible", description: dashboardResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const analyzeProduct = async () => {
    if (!productId.trim()) {
      toast({ title: "Produit requis", description: "Renseigne l'UUID du produit Marketplace a analyser." });
      return;
    }
    setIsWorking(true);
    const { error } = await db.rpc("analyze_marketplace_product", { _product_id: productId.trim() });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse impossible", description: error.message, variant: "destructive" });
      return;
    }
    setProductId("");
    toast({ title: "Fiche analysee", description: "Le Coach IA a cree les recommandations justifiees." });
    await loadData();
  };

  const generateSnapshot = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("generate_marketplace_coach_shop_snapshot", {
      _vendor_shop_id: shopId.trim() || null,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Snapshot impossible", description: error.message, variant: "destructive" });
      return;
    }
    setShopId("");
    toast({ title: "Boutique analysee", description: "Le tableau de bord Marketplace a ete mis a jour." });
    await loadData();
  };

  const updateRecommendation = async (recommendationId: string, status: string) => {
    const { error } = await db.rpc("update_marketplace_coach_recommendation_status", {
      _recommendation_id: recommendationId,
      _status: status,
    });
    if (error) {
      toast({ title: "Mise a jour impossible", description: error.message, variant: "destructive" });
      return;
    }
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Coach IA Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P2.2 Coach IA Marketplace</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Assistant vendeur pour ameliorer fiches, images, SEO, stock et performance commerciale. Aucun impact P0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={generateSnapshot} disabled={isWorking}>
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
            Analyser ma boutique
          </Button>
        </div>
      </div>

      {snapshot ? (
        <div className="grid gap-4 md:grid-cols-5">
          <ScoreCard title="Score boutique" value={snapshot.shop_score} icon={<Store className="h-4 w-4" />} />
          <ScoreCard title="Qualite fiches" value={snapshot.product_quality_score} icon={<Target className="h-4 w-4" />} />
          <ScoreCard title="Images" value={snapshot.image_quality_score} icon={<ImageIcon className="h-4 w-4" />} />
          <ScoreCard title="SEO" value={snapshot.seo_score} icon={<Search className="h-4 w-4" />} />
          <ScoreCard title="Completude" value={snapshot.completeness_score} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>
      ) : (
        <Card className="border-gold/20 bg-noir/60">
          <CardContent className="p-6 text-muted-foreground">
            Aucun snapshot boutique. Lance une analyse pour initialiser le Coach IA Marketplace.
          </CardContent>
        </Card>
      )}

      <Card className="border-gold/20 bg-noir/60">
        <CardHeader>
          <CardTitle className="text-cream">Analyse rapide</CardTitle>
          <CardDescription>Le vendeur peut analyser une fiche precise ou consolider toute sa boutique.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="UUID produit Marketplace" />
          <Input value={shopId} onChange={(event) => setShopId(event.target.value)} placeholder="UUID boutique optionnel pour admin" />
          <Button onClick={analyzeProduct} disabled={isWorking || !productId.trim()}>
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyser la fiche
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          <TabsTrigger value="analyses">Produits analyses</TabsTrigger>
          <TabsTrigger value="shop">Boutique</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-3">
          {recommendations.length === 0 ? (
            <EmptyState text="Aucune recommandation ouverte pour le moment." />
          ) : (
            recommendations.map((recommendation) => (
              <Card key={recommendation.id} className="border-gold/20 bg-noir/60">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      {recommendation.product_image_url ? (
                        <img src={recommendation.product_image_url} alt="" className="h-16 w-12 rounded bg-white object-contain" />
                      ) : (
                        <div className="flex h-16 w-12 items-center justify-center rounded bg-noir-light">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-cream">{recommendation.title}</h3>
                          <Badge className={priorityTone[recommendation.priority]}>{recommendation.priority}</Badge>
                          <Badge className={statusTone[recommendation.status]}>{recommendation.status}</Badge>
                          <Badge variant="outline">{recommendation.recommendation_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                        <p className="text-sm text-cream/75">
                          <span className="text-primary">Justification : </span>
                          {recommendation.justification}
                        </p>
                        {recommendation.product_name && (
                          <div className="text-xs text-muted-foreground">Produit : {recommendation.product_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateRecommendation(recommendation.id, "accepted")}>
                        Accepter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateRecommendation(recommendation.id, "completed")}>
                        Terminer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateRecommendation(recommendation.id, "dismissed")}>
                        Ignorer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analyses" className="space-y-3">
          {analyses.length === 0 ? (
            <EmptyState text="Aucune fiche analysee. Lance une analyse produit pour voir les scores." />
          ) : (
            analyses.map((analysis) => (
              <Card key={analysis.id} className="border-gold/20 bg-noir/60">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[72px_1fr]">
                  {analysis.product_image_url ? (
                    <img src={analysis.product_image_url} alt="" className="h-24 w-16 rounded bg-white object-contain" />
                  ) : (
                    <div className="flex h-24 w-16 items-center justify-center rounded bg-noir-light">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-cream">{analysis.product_name || analysis.product_id}</h3>
                        <p className="text-xs text-muted-foreground">{new Date(analysis.analyzed_at).toLocaleString("fr-FR")}</p>
                      </div>
                      <Badge className={analysis.global_score >= 80 ? "bg-emerald-500/15 text-emerald-300" : "bg-gold/10 text-primary"}>
                        Score {formatScore(analysis.global_score)}
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <MiniScore label="Titre" value={analysis.title_score} />
                      <MiniScore label="Description" value={analysis.description_score} />
                      <MiniScore label="Image" value={analysis.image_score} />
                      <MiniScore label="SEO" value={analysis.seo_score} />
                    </div>
                    <TagList title="Problemes" items={analysis.issues} />
                    <TagList title="Opportunites" items={analysis.opportunities} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="shop">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Analyse globale de boutique</CardTitle>
              <CardDescription>Points forts, points faibles et opportunites detectees par le Coach IA.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <InsightCard title="Forces" items={snapshot?.strengths || []} />
              <InsightCard title="Faiblesses" items={snapshot?.weaknesses || []} />
              <InsightCard title="Opportunites" items={snapshot?.opportunities || []} />
              <MetricLine label="Produits total" value={metrics.total_products} />
              <MetricLine label="Produits actifs" value={metrics.active_products} />
              <MetricLine label="Recommandations ouvertes" value={metrics.open_recommendations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-3">
          {adminOverview.length === 0 ? (
            <EmptyState text="Vue admin indisponible ou aucune boutique analysee." />
          ) : (
            adminOverview.map((shop) => (
              <Card key={`${shop.vendor_shop_id}-${shop.calculated_at}`} className="border-gold/20 bg-noir/60">
                <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
                  <div>
                    <h3 className="font-semibold text-cream">{shop.shop_name || shop.vendor_shop_id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Score moyen des boutiques Marketplace et tendances de qualite.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(shop.weaknesses || []).map((weakness) => <Badge key={weakness} variant="outline">{weakness}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <MiniScore label="Boutique" value={shop.shop_score} />
                    <MiniScore label="Images" value={shop.image_quality_score} />
                    <MiniScore label="SEO" value={shop.seo_score} />
                    <div className="text-sm text-muted-foreground">{shop.open_recommendations} recommandations ouvertes</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card className="border-gold/20 bg-noir/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="text-3xl font-bold text-cream">{formatScore(value)}</div>
        <Progress value={Math.min(100, Number(value || 0))} />
      </CardContent>
    </Card>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{formatScore(value)}</span>
      </div>
      <Progress value={Math.min(100, Number(value || 0))} />
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
      </div>
    </div>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir-light/30 p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold text-cream">
        <Brain className="h-4 w-4 text-primary" />
        {title}
      </div>
      {items.length ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">Aucun element detecte.</div>
      )}
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir-light/30 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-cream">{String(value ?? 0)}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-gold/20 bg-noir/40">
      <CardContent className="flex min-h-[140px] items-center justify-center text-center text-muted-foreground">
        <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
        {text}
      </CardContent>
    </Card>
  );
}
