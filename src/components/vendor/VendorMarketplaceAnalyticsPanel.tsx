import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, FileText, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { VendorShop } from "@/hooks/useVendorShop";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Snapshot = {
  id: string;
  snapshot_date: string;
  vendor_shop_id: string;
  shop_name: string | null;
  product_count: number;
  active_product_count: number;
  new_products_count: number;
  avg_image_score: number;
  avg_coach_score: number;
  avg_seo_score: number;
  avg_discoverability_score: number;
  avg_catalogue_quality_score: number;
  avg_completeness_score: number;
  products_to_enrich_count: number;
  low_visibility_products_count: number;
  pending_recommendations_count: number;
  pending_seo_proposals_count: number;
  pending_catalogue_proposals_count: number;
  duplicate_candidates_count: number;
  approved_enrichments_count: number;
  visibility_score: number;
  marketplace_health_score: number;
  low_visibility_products: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
};

type AlertRow = {
  id: string;
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

export default function VendorMarketplaceAnalyticsPanel({ shop }: { shop: VendorShop }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [trends, setTrends] = useState<Snapshot[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const pendingActions = useMemo(() => {
    if (!snapshot) return 0;
    return Number(snapshot.pending_recommendations_count || 0)
      + Number(snapshot.pending_seo_proposals_count || 0)
      + Number(snapshot.pending_catalogue_proposals_count || 0);
  }, [snapshot]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [snapshotResult, trendsResult, alertsResult] = await Promise.all([
      db.from("my_marketplace_analytics_dashboard").select("*").eq("vendor_shop_id", shop.id).maybeSingle(),
      db.from("my_marketplace_analytics_trends").select("*").eq("vendor_shop_id", shop.id).order("snapshot_date", { ascending: true }).limit(90),
      db.from("my_marketplace_analytics_alerts").select("*").eq("vendor_shop_id", shop.id).order("created_at", { ascending: false }).limit(80),
    ]);

    if (!snapshotResult.error) setSnapshot((snapshotResult.data as Snapshot | null) ?? null);
    if (!trendsResult.error) setTrends(toArray<Snapshot>(trendsResult.data));
    if (!alertsResult.error) setAlerts(toArray<AlertRow>(alertsResult.data));
    if (snapshotResult.error) {
      toast({ title: "Analytics Marketplace indisponible", description: snapshotResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [shop.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const recalculate = async () => {
    setIsWorking(true);
    const { error } = await db.rpc("calculate_marketplace_analytics_snapshot", {
      _vendor_shop_id: shop.id,
      _snapshot_date: new Date().toISOString().slice(0, 10),
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Calcul impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Analytics recalculées", description: "Vos scores et tendances ont été mis à jour." });
    await loadData();
  };

  const exportData = async (format: "csv" | "xlsx" | "pdf") => {
    const { data, error } = await db.rpc("export_marketplace_analytics", {
      _scope: "vendor_dashboard",
      _format: format,
      _vendor_shop_id: shop.id,
      _days: 90,
    });
    if (error) {
      toast({ title: "Export impossible", description: error.message, variant: "destructive" });
      return;
    }
    const rows = toArray<Record<string, unknown>>((data as { rows?: unknown })?.rows);
    downloadRows(rows, `marketplace-analytics-${shop.slug}.${format}`, format);
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/50">
        <CardContent className="flex min-h-[220px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement des insights Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="text-cream">Marketplace Analytics & Insights</CardTitle>
          <CardDescription>Comprenez la qualité, la visibilité et les actions prioritaires de votre boutique. Module analytique uniquement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <ScoreCard label="Santé boutique" value={snapshot?.marketplace_health_score || 0} />
            <Metric label="Produits actifs" value={`${snapshot?.active_product_count || 0}/${snapshot?.product_count || 0}`} />
            <Metric label="Actions à traiter" value={`${pendingActions}`} />
            <Metric label="Alertes" value={`${alerts.filter((alert) => alert.status === "open").length}`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={recalculate} disabled={isWorking} className="bg-gradient-gold text-noir">
              {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
              Recalculer
            </Button>
            <Button variant="outline" onClick={loadData} className="border-gold/30">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button variant="outline" onClick={() => exportData("csv")} className="border-gold/30"><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button variant="outline" onClick={() => exportData("xlsx")} className="border-gold/30"><FileSpreadsheet className="mr-2 h-4 w-4" />XLSX</Button>
            <Button variant="outline" onClick={() => exportData("pdf")} className="border-gold/30"><FileText className="mr-2 h-4 w-4" />PDF</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {!snapshot ? <EmptyState text="Aucun snapshot. Lance le recalcul pour initialiser les insights." /> : (
            <div className="grid gap-4 md:grid-cols-2">
              <InsightScore title="Qualité catalogue" value={snapshot.avg_catalogue_quality_score} />
              <InsightScore title="Images" value={snapshot.avg_image_score} />
              <InsightScore title="SEO" value={snapshot.avg_seo_score} />
              <InsightScore title="Visibilité" value={snapshot.avg_discoverability_score} />
              <InsightScore title="Complétude" value={snapshot.avg_completeness_score} />
              <InsightScore title="Coach Marketplace" value={snapshot.avg_coach_score} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-3">
          {trends.length === 0 ? <EmptyState text="Pas encore de tendance." /> : trends.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3 md:grid-cols-[130px_1fr_120px] md:items-center">
              <div className="text-sm text-muted-foreground">{new Date(row.snapshot_date).toLocaleDateString("fr-FR")}</div>
              <MiniScore label="Santé boutique" value={row.marketplace_health_score} />
              <div className="text-sm text-primary">{row.approved_enrichments_count} enrichis</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="actions" className="grid gap-4 md:grid-cols-2">
          <ActionCard label="Produits à enrichir" value={snapshot?.products_to_enrich_count || 0} />
          <ActionCard label="Produits peu visibles" value={snapshot?.low_visibility_products_count || 0} />
          <ActionCard label="Recommandations ouvertes" value={snapshot?.pending_recommendations_count || 0} />
          <ActionCard label="Propositions SEO" value={snapshot?.pending_seo_proposals_count || 0} />
          <ActionCard label="Propositions catalogue" value={snapshot?.pending_catalogue_proposals_count || 0} />
          <ActionCard label="Doublons candidats" value={snapshot?.duplicate_candidates_count || 0} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {alerts.length === 0 ? <EmptyState text="Aucune alerte." /> : alerts.map((alert) => (
            <Card key={alert.id} className="border-gold/10 bg-noir/40">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-medium text-cream">{alert.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{alert.description}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{alert.alert_type}</Badge>
                  <Badge className={alert.severity === "critical" ? "bg-red-500/15 text-red-300" : "bg-gold/10 text-primary"}>{alert.severity}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ScoreCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-bold text-cream">{score(value)}%</div>
    <Progress value={Math.max(0, Math.min(100, Number(value || 0)))} className="mt-3 h-2" />
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className="mt-2 text-2xl font-bold text-cream">{value}</div>
  </div>
);

const InsightScore = ({ title, value }: { title: string; value: number }) => (
  <Card className="border-gold/10 bg-noir/40">
    <CardContent className="p-4">
      <MiniScore label={title} value={value} />
    </CardContent>
  </Card>
);

const MiniScore = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="mb-1 flex justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <span>{score(value)}%</span>
    </div>
    <Progress value={Math.max(0, Math.min(100, Number(value || 0)))} className="h-2" />
  </div>
);

const ActionCard = ({ label, value }: { label: string; value: number }) => (
  <Card className="border-gold/10 bg-noir/40">
    <CardContent className="flex items-center justify-between p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-primary">{value.toLocaleString("fr-FR")}</div>
    </CardContent>
  </Card>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-muted-foreground">{text}</div>
);

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
