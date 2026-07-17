import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CheckCircle2, FileSearch, Globe2, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { VendorProduct, VendorShop } from "@/hooks/useVendorShop";

type RpcClient = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

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

type ShopSeoScore = {
  vendor_shop_id: string;
  shop_name?: string | null;
  seo_score: number;
  discoverability_score: number;
  product_count: number;
  optimized_product_count: number;
  issues: string[];
  recommendations: Array<{ type?: string; priority?: string; message?: string }>;
  analyzed_at: string;
};

type ProductSeoScore = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_slug?: string | null;
  product_image_url?: string | null;
  product_price?: number | null;
  product_stock_quantity?: number | null;
  seo_score: number;
  discoverability_score: number;
  title_score: number;
  description_score: number;
  media_score: number;
  structured_data_score: number;
  category_score: number;
  search_score: number;
  issues: string[];
  recommendations: Array<{ type?: string; priority?: string; message?: string }>;
  suggested_keywords: string[];
  duplicate_candidates: Array<Record<string, unknown>>;
  analyzed_at: string;
};

type SeoProposal = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  proposal_type: string;
  current_value: { value?: string };
  proposed_value: { value?: string };
  explanation: string;
  status: "draft" | "pending" | "approved" | "rejected" | "applied";
  created_at: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const formatScore = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

type Props = {
  shop: VendorShop;
  products: VendorProduct[];
};

export default function VendorMarketplaceSeoPanel({ shop, products }: Props) {
  const [shopScore, setShopScore] = useState<ShopSeoScore | null>(null);
  const [productScores, setProductScores] = useState<ProductSeoScore[]>([]);
  const [proposals, setProposals] = useState<SeoProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const openProposals = useMemo(
    () => proposals.filter((proposal) => proposal.status === "draft" || proposal.status === "pending"),
    [proposals],
  );

  const productsWithoutScore = useMemo(
    () => products.filter((product) => !productScores.some((score) => score.product_id === product.id)),
    [products, productScores],
  );

  const loadSeoData = async () => {
    setIsLoading(true);
    const [shopResult, productsResult, proposalsResult] = await Promise.all([
      db.from("my_marketplace_seo_shop_score").select("*").maybeSingle(),
      db.from("my_marketplace_seo_latest_products").select("*").order("analyzed_at", { ascending: false }).limit(150),
      db.from("my_marketplace_seo_proposals").select("*").order("created_at", { ascending: false }).limit(120),
    ]);
    setIsLoading(false);

    if (shopResult.error) {
      toast({ title: "SEO Marketplace indisponible", description: shopResult.error.message, variant: "destructive" });
      return;
    }
    if (productsResult.error || proposalsResult.error) {
      toast({
        title: "Données SEO partielles",
        description: productsResult.error?.message || proposalsResult.error?.message,
        variant: "destructive",
      });
    }

    setShopScore((shopResult.data as ShopSeoScore | null) ?? null);
    setProductScores(toArray<ProductSeoScore>(productsResult.data));
    setProposals(toArray<SeoProposal>(proposalsResult.data));
  };

  const analyzeShop = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_shop_seo");
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse boutique impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "SEO boutique recalculé", description: "Le score de découvrabilité a été mis à jour." });
    await loadSeoData();
  };

  const analyzeProduct = async (productId: string) => {
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_product_seo", { _product_id: productId });
    setIsWorking(false);
    if (error) {
      toast({ title: "Analyse produit impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produit analysé", description: "Les recommandations SEO ont été recalculées." });
    await loadSeoData();
  };

  const generateProposals = async (productId: string) => {
    setIsWorking(true);
    const { error } = await db.rpc("generate_marketplace_seo_product_proposals", { _product_id: productId });
    setIsWorking(false);
    if (error) {
      toast({ title: "Propositions impossibles", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Propositions créées", description: "Aucune modification n'est publiée automatiquement." });
    await loadSeoData();
  };

  const updateProposal = async (proposalId: string, status: SeoProposal["status"]) => {
    const { error } = await db.rpc("update_marketplace_seo_proposal_status", {
      _proposal_id: proposalId,
      _status: status,
      _explanation: "Action vendeur depuis le panneau SEO Marketplace",
    });
    if (error) {
      toast({ title: "Mise à jour impossible", description: error.message, variant: "destructive" });
      return;
    }
    await loadSeoData();
  };

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-cream">
              <Globe2 className="h-5 w-5 text-primary" />
              SEO & Discoverability Marketplace
            </CardTitle>
            <CardDescription className="text-cream/60">
              Optimisez les titres, descriptions, mots-clés et données publiques de {shop.name}. Aucune publication automatique.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadSeoData} disabled={isLoading} className="border-gold/30 text-cream">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualiser
            </Button>
            <Button onClick={analyzeShop} disabled={isWorking || products.length === 0} className="bg-gradient-gold text-noir">
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyser la boutique
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {products.length === 0 ? (
          <EmptyState text="Votre boutique ne contient pas encore de produit public. Le SEO Marketplace s'activera dès la première fiche." />
        ) : (
          <>
            {shopScore ? (
              <div className="grid gap-3 md:grid-cols-4">
                <ScoreCard label="SEO boutique" value={shopScore.seo_score} icon={<Globe2 className="h-4 w-4" />} />
                <ScoreCard label="Découvrabilité" value={shopScore.discoverability_score} icon={<Search className="h-4 w-4" />} />
                <ScoreCard label="Produits publics" value={shopScore.product_count} suffix="" icon={<FileSearch className="h-4 w-4" />} />
                <ScoreCard label="Optimisés" value={shopScore.optimized_product_count} suffix="" icon={<CheckCircle2 className="h-4 w-4" />} />
              </div>
            ) : (
              <EmptyState text="Aucun score SEO boutique disponible. Lancez l'analyse pour initialiser le moteur." />
            )}

            {productsWithoutScore.length > 0 && (
              <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 text-sm text-cream/70">
                {productsWithoutScore.length} produit(s) n'ont pas encore été analysés par le moteur SEO.
              </div>
            )}

            <Tabs defaultValue="products" className="space-y-4">
              <TabsList className="border border-gold/20 bg-noir-light/60">
                <TabsTrigger value="products">Produits</TabsTrigger>
                <TabsTrigger value="proposals">Propositions</TabsTrigger>
                <TabsTrigger value="preview">Aperçu Google</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-3">
                {products.map((product) => {
                  const productScore = productScores.find((item) => item.product_id === product.id);
                  return (
                    <div key={product.id} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3 md:grid-cols-[70px_1fr_auto]">
                      <img src={product.image_url ?? "/placeholder.svg"} alt={product.name} className="h-20 w-14 rounded bg-white object-contain" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-cream">{product.name}</div>
                        <div className="mt-1 text-xs text-cream/50">Stock {product.stock_quantity ?? 0} - {product.is_active ? "Actif" : "Inactif"}</div>
                        {productScore ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <Metric label="SEO" value={productScore.seo_score} />
                            <Metric label="Découvrabilité" value={productScore.discoverability_score} />
                            <Metric label="Titre" value={productScore.title_score} />
                            <Metric label="Description" value={productScore.description_score} />
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-cream/50">Pas encore analysé.</p>
                        )}
                        {productScore?.issues?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {productScore.issues.slice(0, 4).map((issue) => <Badge key={issue} variant="outline">{issue}</Badge>)}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 md:w-52">
                        <Button variant="outline" onClick={() => analyzeProduct(product.id)} disabled={isWorking} className="border-gold/30 text-cream">
                          Analyser
                        </Button>
                        <Button onClick={() => generateProposals(product.id)} disabled={isWorking} className="bg-gradient-gold text-noir">
                          Proposer SEO
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="proposals" className="space-y-3">
                {openProposals.length === 0 ? (
                  <EmptyState text="Aucune proposition SEO en attente. Utilisez Proposer SEO depuis un produit." />
                ) : (
                  openProposals.map((proposal) => (
                    <div key={proposal.id} className="rounded-lg border border-gold/10 bg-noir/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-cream">{proposal.product_name || "Boutique"} - {proposal.proposal_type}</div>
                          <p className="mt-1 text-sm text-cream/60">{proposal.explanation}</p>
                        </div>
                        <Badge variant="outline">{proposal.status}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <PreviewBox label="Actuel" value={proposal.current_value?.value || "Non renseigné"} />
                        <PreviewBox label="Proposé" value={proposal.proposed_value?.value || "Non renseigné"} highlight />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateProposal(proposal.id, "pending")}>Mettre en attente</Button>
                        <Button size="sm" variant="outline" onClick={() => updateProposal(proposal.id, "rejected")}>Rejeter</Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="preview" className="space-y-3">
                {productScores.slice(0, 8).map((product) => (
                  <div key={product.id} className="rounded-lg border border-gold/10 bg-white p-4 text-left text-slate-900">
                    <div className="text-sm text-emerald-700">www.lapetitebouteille.com/produit/{product.product_slug}</div>
                    <div className="mt-1 text-xl text-blue-700">{product.product_name}</div>
                    <p className="mt-1 text-sm text-slate-700">
                      Score SEO {formatScore(product.seo_score)}. Mots-clés suggérés : {product.suggested_keywords?.slice(0, 4).join(", ") || "à compléter"}.
                    </p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const ScoreCard = ({ label, value, suffix = "%", icon }: { label: string; value: number; suffix?: string; icon: ReactNode }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/50 p-4">
    <div className="flex items-center justify-between text-sm text-cream/50">
      {label}
      <span className="text-primary">{icon}</span>
    </div>
    <div className="mt-2 text-2xl font-semibold text-cream">{formatScore(value)}{suffix}</div>
    {suffix && <Progress value={Math.min(100, Number(value || 0))} className="mt-3 h-2" />}
  </div>
);

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs text-cream/50">
      <span>{label}</span>
      <span>{formatScore(value)}%</span>
    </div>
    <Progress value={Math.min(100, Number(value || 0))} className="h-1.5" />
  </div>
);

const PreviewBox = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-md border p-3 text-sm ${highlight ? "border-primary/40 bg-primary/10 text-primary" : "border-cream/10 bg-noir/40 text-cream/70"}`}>
    <div className="mb-1 text-xs uppercase tracking-wide opacity-60">{label}</div>
    {value}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-cream/60">
    <BarChart3 className="mx-auto mb-3 h-8 w-8 text-primary/70" />
    {text}
  </div>
);
