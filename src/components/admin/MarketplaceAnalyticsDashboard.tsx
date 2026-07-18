import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BarChart3, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Store, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type AdminOverview = {
  shops_analyzed: number;
  product_count: number;
  active_product_count: number;
  marketplace_health_score: number;
  catalogue_quality_score: number;
  image_score: number;
  seo_score: number;
  discoverability_score: number;
  products_to_enrich_count: number;
  duplicate_candidates_count: number;
  approved_enrichments_count: number;
  pending_actions_count: number;
  top_shops: Array<Record<string, unknown>>;
  shops_to_support: Array<Record<string, unknown>>;
};

type ShopRanking = {
  id: string;
  snapshot_date: string;
  vendor_shop_id: string;
  shop_name: string | null;
  product_count: number;
  active_product_count: number;
  marketplace_health_score: number;
  avg_catalogue_quality_score: number;
  avg_image_score: number;
  avg_seo_score: number;
  avg_discoverability_score: number;
  products_to_enrich_count: number;
  low_visibility_products_count: number;
  duplicate_candidates_count: number;
  pending_recommendations_count: number;
  pending_seo_proposals_count: number;
  pending_catalogue_proposals_count: number;
  approved_enrichments_count: number;
  top_categories: Array<Record<string, unknown>>;
  top_brands: Array<Record<string, unknown>>;
};

type TrendRow = {
  snapshot_date: string;
  shops_count: number;
  product_count: number;
  marketplace_health_score: number;
  catalogue_quality_score: number;
  image_score: number;
  seo_score: number;
  duplicate_candidates_count: number;
  approved_enrichments_count: number;
};

type AlertRow = {
  id: string;
  shop_name: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  metric_value: number | null;
  threshold_value: number | null;
  status: string;
  created_at: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const score = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function MarketplaceAnalyticsDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [shops, setShops] = useState<ShopRanking[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const criticalAlerts = useMemo(() => alerts.filter((alert) => ["critical", "high"].includes(alert.severity)), [alerts]);

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, shopsResult, trendsResult, alertsResult] = await Promise.all([
      db.from("admin_marketplace_analytics_overview").select("*").maybeSingle(),
      db.from("admin_marketplace_analytics_shop_rankings").select("*").order("marketplace_health_score", { ascending: false }).limit(100),
      db.from("admin_marketplace_analytics_trends").select("*").order("snapshot_date", { ascending: true }).limit(180),
      db.from("my_marketplace_analytics_alerts").select("*").order("created_at", { ascending: false }).limit(120),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as AdminOverview | null) ?? null);
    if (!shopsResult.error) setShops(toArray<ShopRanking>(shopsResult.data));
    if (!trendsResult.error) setTrends(toArray<TrendRow>(trendsResult.data));
    if (!alertsResult.error) setAlerts(toArray<AlertRow>(alertsResult.data));
    if (overviewResult.error) {
      toast({ title: "Analytics Marketplace indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const recalculate = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_analytics_snapshot", {
      _vendor_shop_id: null,
      _snapshot_date: new Date().toISOString().slice(0, 10),
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Calcul analytics impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Snapshots Marketplace recalculés", description: "Les tendances et alertes ont été mises à jour." });
    await loadData();
  };

  const exportData = async (format: "csv" | "xlsx" | "pdf") => {
    const { data, error } = await db.rpc("export_marketplace_analytics", {
      _scope: "admin_overview",
      _format: format,
      _vendor_shop_id: null,
      _days: 90,
    });
    if (error) {
      toast({ title: "Export impossible", description: error.message, variant: "destructive" });
      return;
    }
    const rows = toArray<Record<string, unknown>>((data as { rows?: unknown })?.rows);
    downloadRows(rows, `marketplace-analytics-admin.${format}`, format);
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement des analytics Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P2.5 Marketplace Analytics & Insights</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Pilotage décisionnel Marketplace : scores, tendances, alertes et exports. Lecture analytique uniquement, aucun impact P0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={recalculate} disabled={isWorking} className="bg-gradient-gold text-noir">
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Recalculer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="Santé Marketplace" value={overview?.marketplace_health_score || 0} />
        <MetricCard label="Boutiques analysées" value={overview?.shops_analyzed || 0} icon={<Store className="h-5 w-5" />} />
        <MetricCard label="Actions en attente" value={overview?.pending_actions_count || 0} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard label="Alertes fortes" value={criticalAlerts.length} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => exportData("csv")} className="border-gold/30">
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
        <Button variant="outline" onClick={() => exportData("xlsx")} className="border-gold/30">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          XLSX
        </Button>
        <Button variant="outline" onClick={() => exportData("pdf")} className="border-gold/30">
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>

      <Tabs defaultValue="shops" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="shops">Boutiques</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="taxonomy">Catégories & marques</TabsTrigger>
        </TabsList>

        <TabsContent value="shops" className="space-y-3">
          {shops.length === 0 ? <EmptyState text="Aucun snapshot Marketplace. Lance le recalcul pour initialiser le tableau." /> : shops.map((shop) => (
            <Card key={shop.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_320px_140px] md:items-center">
                <div>
                  <div className="font-medium text-cream">{shop.shop_name || shop.vendor_shop_id}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {shop.active_product_count}/{shop.product_count} produits actifs - {shop.products_to_enrich_count} à enrichir - {shop.duplicate_candidates_count} doublons candidats
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <MiniScore label="Catalogue" value={shop.avg_catalogue_quality_score} />
                  <MiniScore label="Image" value={shop.avg_image_score} />
                  <MiniScore label="SEO" value={shop.avg_seo_score} />
                  <MiniScore label="Visibilité" value={shop.avg_discoverability_score} />
                </div>
                <Badge variant={shop.marketplace_health_score >= 80 ? "default" : "outline"}>{score(shop.marketplace_health_score)}%</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Séries temporelles</CardTitle>
              <CardDescription>Évolution quotidienne consolidée sur la Marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {trends.length === 0 ? <EmptyState text="Pas encore de tendance." /> : trends.map((row) => (
                <div key={row.snapshot_date} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3 md:grid-cols-[130px_1fr_120px_120px] md:items-center">
                  <div className="text-sm text-muted-foreground">{new Date(row.snapshot_date).toLocaleDateString("fr-FR")}</div>
                  <MiniScore label="Santé Marketplace" value={row.marketplace_health_score} />
                  <div className="text-sm text-cream">{row.product_count} produits</div>
                  <div className="text-sm text-primary">{row.approved_enrichments_count} enrichis</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {alerts.length === 0 ? <EmptyState text="Aucune alerte active." /> : alerts.map((alert) => (
            <Card key={alert.id} className="border-gold/10 bg-noir/50">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-medium text-cream">{alert.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{alert.shop_name} - {alert.description}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString("fr-FR")}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{alert.alert_type}</Badge>
                  <Badge className={alert.severity === "critical" ? "bg-red-500/15 text-red-300" : "bg-gold/10 text-primary"}>{alert.severity}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="taxonomy">
          <div className="grid gap-4 lg:grid-cols-2">
            <JsonList title="Catégories les plus actives" rows={flattenMetric(shops, "top_categories")} />
            <JsonList title="Marques les plus représentées" rows={flattenMetric(shops, "top_brands")} />
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
        <div className="mt-2 text-2xl font-bold text-cream">{Number(value || 0).toLocaleString("fr-FR")}</div>
      </div>
      <div className="rounded-full bg-gold/10 p-3 text-primary">{icon}</div>
    </CardContent>
  </Card>
);

const ScoreCard = ({ label, value }: { label: string; value: number }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="space-y-3 p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-cream">{score(value)}%</div>
      <Progress value={Math.max(0, Math.min(100, Number(value || 0)))} className="h-2" />
    </CardContent>
  </Card>
);

const MiniScore = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{score(value)}%</span>
    </div>
    <Progress value={Math.max(0, Math.min(100, Number(value || 0)))} className="h-2" />
  </div>
);

const JsonList = ({ title, rows }: { title: string; rows: Record<string, unknown>[] }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardHeader>
      <CardTitle className="text-cream">{title}</CardTitle>
      <CardDescription>{rows.length} signaux consolidés</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      {rows.slice(0, 12).map((row, index) => (
        <div key={`${title}-${index}`} className="rounded-lg border border-gold/10 bg-noir/40 p-3 text-sm text-muted-foreground">
          {Object.entries(row).map(([key, value]) => <span key={key} className="mr-3"><span className="text-primary">{key}</span>: {String(value)}</span>)}
        </div>
      ))}
    </CardContent>
  </Card>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-muted-foreground">{text}</div>
);

const flattenMetric = (shops: ShopRanking[], key: "top_categories" | "top_brands") =>
  shops.flatMap((shop) => (Array.isArray(shop[key]) ? shop[key] : []).map((row) => ({ shop: shop.shop_name || shop.vendor_shop_id, ...row })));

const downloadRows = (rows: Record<string, unknown>[], filename: string, format: "csv" | "xlsx" | "pdf") => {
  const headers = Object.keys(rows[0] || { empty: "" });
  const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
  if (format === "csv") {
    triggerDownload(csv, filename, "text/csv;charset=utf-8");
    return;
  }
  const html = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${String(row[h] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  triggerDownload(html, filename, format === "xlsx" ? "application/vnd.ms-excel" : "application/pdf");
};

const triggerDownload = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
