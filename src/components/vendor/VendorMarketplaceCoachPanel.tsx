import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Brain, CheckCircle2, ImageIcon, Loader2, RefreshCw, Search, ShieldCheck, Sparkles, Store, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { VendorProduct, VendorShop } from "@/hooks/useVendorShop";

type RpcClient = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: RpcClient;
};

type CoachSnapshot = {
  vendor_shop_id: string;
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
  products_to_optimize: Array<{ product_id?: string; score?: number; issues?: string[] }>;
  metrics: Record<string, unknown>;
  calculated_at: string;
};

type CoachRecommendation = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  product_image_url?: string | null;
  recommendation_type: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  justification: string;
  status: "open" | "accepted" | "completed" | "dismissed";
  created_at: string;
};

type ProductAnalysis = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_image_url?: string | null;
  global_score: number;
  image_score: number;
  seo_score: number;
  issues: string[];
  opportunities: string[];
  analyzed_at: string;
};

const db = supabase as unknown as QueryClient;

const priorityTone = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-gold/10 text-primary border-gold/30",
  low: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const statusTone = {
  open: "bg-gold/10 text-primary border-gold/30",
  accepted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  dismissed: "bg-muted text-muted-foreground",
};

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const score = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

type VendorMarketplaceCoachPanelProps = {
  shop: VendorShop;
  products: VendorProduct[];
};

export default function VendorMarketplaceCoachPanel({ shop, products }: VendorMarketplaceCoachPanelProps) {
  const [snapshot, setSnapshot] = useState<CoachSnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<CoachRecommendation[]>([]);
  const [analyses, setAnalyses] = useState<ProductAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const openRecommendations = useMemo(
    () => recommendations.filter((item) => item.status === "open"),
    [recommendations],
  );
  const criticalRecommendations = useMemo(
    () => openRecommendations.filter((item) => item.priority === "critical" || item.priority === "high"),
    [openRecommendations],
  );

  const loadCoachData = async () => {
    setIsLoading(true);
    const [dashboardResult, recommendationsResult, analysesResult] = await Promise.all([
      db.from("my_marketplace_coach_dashboard").select("*").maybeSingle(),
      db.from("my_marketplace_coach_recommendations").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_coach_product_analyses").select("*").order("analyzed_at", { ascending: false }).limit(80),
    ]);

    setIsLoading(false);

    if (dashboardResult.error) {
      toast({ title: "Coach indisponible", description: dashboardResult.error.message, variant: "destructive" });
      return;
    }
    if (recommendationsResult.error || analysesResult.error) {
      toast({
        title: "Données Coach partielles",
        description: recommendationsResult.error?.message || analysesResult.error?.message,
        variant: "destructive",
      });
    }

    setSnapshot((dashboardResult.data as CoachSnapshot | null) ?? null);
    setRecommendations(toArray<CoachRecommendation>(recommendationsResult.data));
    setAnalyses(toArray<ProductAnalysis>(analysesResult.data));
  };

  const generateSnapshot = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("generate_marketplace_coach_shop_snapshot");
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse boutique impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Boutique analysée", description: "Le Coach Marketplace a mis à jour vos scores." });
    await loadCoachData();
  };

  const analyzeProduct = async (productId: string) => {
    setIsWorking(true);
    const { error } = await db.rpc("analyze_marketplace_product", { _product_id: productId });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse produit impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produit analysé", description: "Les recommandations de cette fiche ont été recalculées." });
    await loadCoachData();
  };

  const updateRecommendation = async (recommendationId: string, status: CoachRecommendation["status"]) => {
    const { error } = await db.rpc("update_marketplace_coach_recommendation_status", {
      _recommendation_id: recommendationId,
      _status: status,
    });
    if (error) {
      toast({ title: "Mise à jour impossible", description: error.message, variant: "destructive" });
      return;
    }
    await loadCoachData();
  };

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-cream">
              <Brain className="h-5 w-5 text-primary" />
              Coach Marketplace
            </CardTitle>
            <CardDescription className="text-cream/60">
              Conseils qualité pour {shop.name}. Les données sont limitées à votre boutique.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadCoachData} disabled={isLoading} className="border-gold/30 text-cream">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualiser
            </Button>
            <Button onClick={generateSnapshot} disabled={isWorking || products.length === 0} className="bg-gradient-gold text-noir">
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser ma boutique
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {products.length === 0 ? (
          <EmptyState text="Votre boutique ne contient encore aucun produit. Le Coach Marketplace s'activera dès qu'un produit sera publié." />
        ) : (
          <>
            {snapshot ? (
              <div className="grid gap-3 md:grid-cols-5">
                <ScoreCard label="Boutique" value={snapshot.shop_score} icon={<Store className="h-4 w-4" />} />
                <ScoreCard label="Fiches" value={snapshot.product_quality_score} icon={<Target className="h-4 w-4" />} />
                <ScoreCard label="Images" value={snapshot.image_quality_score} icon={<ImageIcon className="h-4 w-4" />} />
                <ScoreCard label="SEO" value={snapshot.seo_score} icon={<Search className="h-4 w-4" />} />
                <ScoreCard label="Complétude" value={snapshot.completeness_score} icon={<CheckCircle2 className="h-4 w-4" />} />
              </div>
            ) : (
              <EmptyState text="Aucune analyse de boutique disponible. Lancez une analyse pour initialiser votre Coach Marketplace." />
            )}

            {criticalRecommendations.length > 0 && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                <div className="mb-3 font-semibold text-orange-200">Recommandations prioritaires</div>
                <div className="grid gap-3">
                  {criticalRecommendations.slice(0, 3).map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} onUpdate={updateRecommendation} />
                  ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="recommendations" className="space-y-4">
              <TabsList className="border border-gold/20 bg-noir-light/60">
                <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
                <TabsTrigger value="products">Produits à optimiser</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <TabsContent value="recommendations" className="space-y-3">
                {openRecommendations.length === 0 ? (
                  <EmptyState text="Aucune recommandation ouverte pour le moment." />
                ) : (
                  openRecommendations.map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} onUpdate={updateRecommendation} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="products" className="space-y-3">
                {products.map((product) => {
                  const lastAnalysis = analyses.find((analysis) => analysis.product_id === product.id);
                  return (
                    <div key={product.id} className="flex flex-col gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3 sm:flex-row sm:items-center">
                      <img src={product.image_url ?? "/placeholder.svg"} alt={product.name} className="h-20 w-14 rounded bg-white object-contain" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-cream">{product.name}</div>
                        <div className="text-xs text-cream/50">Stock {product.stock_quantity ?? 0} - {product.is_active ? "Actif" : "Inactif"}</div>
                        {lastAnalysis ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">Score {score(lastAnalysis.global_score)}</Badge>
                            {lastAnalysis.issues.slice(0, 2).map((issue) => <Badge key={issue} variant="outline">{issue}</Badge>)}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-cream/50">Aucune analyse récente.</div>
                        )}
                      </div>
                      <Button variant="outline" onClick={() => analyzeProduct(product.id)} disabled={isWorking} className="border-gold/30 text-cream">
                        Analyser
                      </Button>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="history" className="space-y-3">
                {analyses.length === 0 ? (
                  <EmptyState text="Aucun historique d'analyse disponible." />
                ) : (
                  analyses.map((analysis) => (
                    <div key={analysis.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-cream">{analysis.product_name || analysis.product_id}</div>
                          <div className="text-xs text-cream/50">{new Date(analysis.analyzed_at).toLocaleString("fr-FR")}</div>
                        </div>
                        <Badge className={analysis.global_score >= 80 ? "bg-emerald-500/15 text-emerald-300" : "bg-gold/10 text-primary"}>
                          Score {score(analysis.global_score)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir-light/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-cream/60">
        <span>{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mb-2 text-2xl font-bold text-cream">{score(value)}</div>
      <Progress value={Math.min(100, Number(value || 0))} />
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onUpdate,
}: {
  recommendation: CoachRecommendation;
  onUpdate: (id: string, status: CoachRecommendation["status"]) => void;
}) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {recommendation.product_image_url ? (
            <img src={recommendation.product_image_url} alt="" className="h-16 w-12 rounded bg-white object-contain" />
          ) : (
            <div className="flex h-16 w-12 items-center justify-center rounded bg-noir-light">
              <ImageIcon className="h-5 w-5 text-cream/40" />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-cream">{recommendation.title}</span>
              <Badge className={priorityTone[recommendation.priority]}>{recommendation.priority}</Badge>
              <Badge className={statusTone[recommendation.status]}>{recommendation.status}</Badge>
            </div>
            <p className="text-sm text-cream/60">{recommendation.description}</p>
            <p className="text-xs text-cream/50">{recommendation.justification}</p>
            {recommendation.product_name && <p className="text-xs text-primary">Produit : {recommendation.product_name}</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onUpdate(recommendation.id, "accepted")}>
            Vu
          </Button>
          <Button size="sm" variant="outline" onClick={() => onUpdate(recommendation.id, "completed")}>
            Fait
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onUpdate(recommendation.id, "dismissed")}>
            Ignorer
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-sm text-cream/60">
      <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
      {text}
    </div>
  );
}
