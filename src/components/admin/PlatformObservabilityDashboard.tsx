import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, Gauge, Loader2, RefreshCw, Server, ShieldAlert } from "lucide-react";
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

type Overview = {
  platform_health_score: number;
  service_count: number;
  open_alert_count: number;
  critical_alert_count: number;
  high_alert_count: number;
  logs_24h: number;
  errors_24h: number;
  runs_24h: number;
  failed_runs_24h: number;
  last_scan_at: string | null;
};

type ServiceRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  owner_module: string;
  description: string | null;
  last_metric_name: string | null;
  last_metric_value: number | null;
  last_metric_status: string | null;
  last_metric_severity: string | null;
  last_observed_at: string | null;
  open_alert_count: number;
};

type AlertRow = {
  id: string;
  service_code: string;
  title: string;
  severity: string;
  status: string;
  component_type: string;
  component_name: string;
  metric_name: string;
  metric_value: number;
  threshold: number | null;
  diagnosis: string;
  probable_causes: string[] | null;
  recommendations: string[] | null;
  opened_at: string;
};

type LogRow = {
  id: string;
  service_code: string;
  severity: string;
  event_type: string;
  component_type: string;
  component_name: string;
  message: string;
  created_at: string;
};

type TrendRow = {
  bucket_hour: string;
  service_code: string;
  component_type: string;
  metric_name: string;
  avg_value: number;
  max_value: number;
  samples_count: number;
};

type QueueRow = {
  service_code: string;
  metric_name: string;
  metric_value: number;
  status: string;
  severity: string;
  observed_at: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const formatNumber = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function PlatformObservabilityDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [queues, setQueues] = useState<QueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const healthScore = Number(overview?.platform_health_score || 0);
  const healthLabel = useMemo(() => {
    if (healthScore >= 95) return "Stable";
    if (healthScore >= 80) return "Surveillance";
    if (healthScore >= 60) return "Degrade";
    return "Critique";
  }, [healthScore]);

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, servicesResult, alertsResult, logsResult, trendsResult, queuesResult] = await Promise.all([
      db.from("admin_platform_observability_overview").select("*").maybeSingle(),
      db.from("admin_platform_observability_services").select("*").order("open_alert_count", { ascending: false }).limit(100),
      db.from("admin_platform_observability_recent_alerts").select("*").order("opened_at", { ascending: false }).limit(120),
      db.from("admin_platform_observability_recent_logs").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_platform_observability_metric_trends").select("*").order("bucket_hour", { ascending: false }).limit(120),
      db.from("admin_platform_observability_queue_health").select("*").order("observed_at", { ascending: false }).limit(80),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!servicesResult.error) setServices(toArray<ServiceRow>(servicesResult.data));
    if (!alertsResult.error) setAlerts(toArray<AlertRow>(alertsResult.data));
    if (!logsResult.error) setLogs(toArray<LogRow>(logsResult.data));
    if (!trendsResult.error) setTrends(toArray<TrendRow>(trendsResult.data));
    if (!queuesResult.error) setQueues(toArray<QueueRow>(queuesResult.data));

    const firstError = [overviewResult, servicesResult, alertsResult, logsResult, trendsResult, queuesResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "Observabilite indisponible", description: firstError.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const runScan = async () => {
    setIsScanning(true);
    const { data, error } = await db.rpc("scan_platform_observability", { _scope: { source: "admin_dashboard" } });
    setIsScanning(false);
    if (error) {
      toast({ title: "Scan Observabilite impossible", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { metrics_collected?: number; alerts_created?: number } | null;
    toast({
      title: "Scan Observabilite termine",
      description: `${result?.metrics_collected ?? 0} metriques collectees, ${result?.alerts_created ?? 0} alertes creees.`,
    });
    await loadData();
  };

  const updateAlert = async (alertId: string, status: "acknowledged" | "resolved") => {
    setActiveAlertId(alertId);
    const { error } = await db.rpc("acknowledge_platform_observability_alert", {
      _alert_id: alertId,
      _status: status,
      _note: status === "resolved" ? "Resolution marquee depuis le dashboard P3.5." : "Alerte prise en charge depuis le dashboard P3.5.",
    });
    setActiveAlertId(null);
    if (error) {
      toast({ title: "Mise a jour alerte impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "resolved" ? "Alerte resolue" : "Alerte prise en charge" });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de l'observabilite plateforme...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P3.5 Platform Observability & Health</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Surveillance technique transversale : metriques, logs, files, alertes et diagnostics. Lecture et journalisation uniquement, sans impact P0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={runScan} disabled={isScanning} className="bg-gradient-gold text-noir">
            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            Scanner
          </Button>
        </div>
      </div>

      <Card className="border-gold/20 bg-noir/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream">
            <Gauge className="h-5 w-5 text-primary" />
            Platform Health Score
          </CardTitle>
          <CardDescription>Indicateur operationnel base sur les alertes ouvertes, erreurs recentes et derniers scans.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div>
            <div className="text-5xl font-bold text-cream">{formatNumber(healthScore)} %</div>
            <Badge className={healthScore >= 80 ? "mt-3 bg-emerald-500/15 text-emerald-300" : "mt-3 bg-red-500/15 text-red-300"}>
              {healthLabel}
            </Badge>
            <Progress value={Math.max(0, Math.min(100, healthScore))} className="mt-5 h-2" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Services actifs" value={overview?.service_count || 0} icon={<Server className="h-5 w-5" />} />
            <MetricCard label="Alertes ouvertes" value={overview?.open_alert_count || 0} icon={<AlertTriangle className="h-5 w-5" />} />
            <MetricCard label="Erreurs 24h" value={overview?.errors_24h || 0} icon={<ShieldAlert className="h-5 w-5" />} />
            <MetricCard label="Scans 24h" value={overview?.runs_24h || 0} icon={<Clock className="h-5 w-5" />} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="queues">Files</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="grid gap-4 xl:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-cream">{service.name}</h3>
                    <Badge variant="outline">{service.owner_module}</Badge>
                    <StatusBadge status={service.last_metric_status || "unknown"} severity={service.last_metric_severity || "low"} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description || service.code}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Dernier signal : {service.last_metric_name || "aucun"} {service.last_metric_value !== null ? `= ${formatNumber(service.last_metric_value)}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{service.open_alert_count}</div>
                  <div className="text-xs text-muted-foreground">alertes ouvertes</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {alerts.length === 0 ? <EmptyState text="Aucune alerte recente." /> : alerts.map((alert) => (
            <Card key={alert.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-cream">{alert.title}</h3>
                    <StatusBadge status={alert.status} severity={alert.severity} />
                    <Badge variant="outline">{alert.service_code}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.diagnosis}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ListBlock title="Causes probables" rows={alert.probable_causes || []} />
                    <ListBlock title="Recommandations" rows={alert.recommendations || []} />
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-gold/10 bg-noir/40 p-3">
                  <div className="text-sm text-muted-foreground">
                    {alert.component_type} / {alert.component_name}
                  </div>
                  <div className="text-sm text-cream">
                    {alert.metric_name}: {formatNumber(alert.metric_value)}
                    {alert.threshold !== null ? ` / seuil ${formatNumber(alert.threshold)}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(alert.opened_at).toLocaleString("fr-FR")}</div>
                  {alert.status === "open" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={activeAlertId === alert.id} onClick={() => updateAlert(alert.id, "acknowledged")}>
                        Prendre en charge
                      </Button>
                      <Button size="sm" disabled={activeAlertId === alert.id} onClick={() => updateAlert(alert.id, "resolved")} className="bg-gradient-gold text-noir">
                        Resoudre
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="space-y-2">
          {logs.length === 0 ? <EmptyState text="Aucun log centralise." /> : logs.map((log) => (
            <div key={log.id} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/50 p-3 md:grid-cols-[150px_160px_1fr_170px] md:items-center">
              <StatusBadge status={log.event_type} severity={log.severity} />
              <div className="text-sm text-primary">{log.service_code}</div>
              <div>
                <div className="text-sm text-cream">{log.message}</div>
                <div className="text-xs text-muted-foreground">{log.component_type} / {log.component_name}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="queues" className="space-y-2">
          {queues.length === 0 ? <EmptyState text="Aucune metrique de file. Lance un scan pour initialiser." /> : queues.map((queue, index) => (
            <div key={`${queue.service_code}-${queue.metric_name}-${index}`} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/50 p-3 md:grid-cols-[180px_1fr_120px_170px] md:items-center">
              <div className="text-sm text-primary">{queue.service_code}</div>
              <div className="text-sm text-cream">{queue.metric_name}</div>
              <StatusBadge status={queue.status} severity={queue.severity} />
              <div className="text-right text-sm font-semibold text-cream">{formatNumber(queue.metric_value)}</div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="trends" className="space-y-2">
          {trends.length === 0 ? <EmptyState text="Aucune tendance. Lance un scan pour alimenter les series." /> : trends.map((trend, index) => (
            <div key={`${trend.bucket_hour}-${trend.service_code}-${trend.metric_name}-${index}`} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/50 p-3 md:grid-cols-[160px_160px_1fr_130px_120px] md:items-center">
              <div className="text-xs text-muted-foreground">{new Date(trend.bucket_hour).toLocaleString("fr-FR")}</div>
              <div className="text-sm text-primary">{trend.service_code}</div>
              <div className="text-sm text-cream">{trend.metric_name}</div>
              <div className="text-sm text-muted-foreground">moy. {formatNumber(trend.avg_value)}</div>
              <div className="text-sm text-muted-foreground">{trend.samples_count} samples</div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: ReactNode }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-primary">{icon}</span>
    </div>
    <div className="mt-3 text-2xl font-bold text-cream">{formatNumber(value)}</div>
  </div>
);

const StatusBadge = ({ status, severity }: { status: string; severity: string }) => {
  const critical = ["critical", "error", "failed", "open"].includes(severity) || severity === "critical";
  const warning = ["warning", "medium", "high"].includes(severity);
  const stable = ["ok", "resolved", "completed"].includes(status);
  const className = critical
    ? "bg-red-500/15 text-red-300"
    : warning
      ? "bg-amber-500/15 text-amber-300"
      : stable
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-gold/10 text-primary";
  return <Badge className={className}>{status}</Badge>;
};

const ListBlock = ({ title, rows }: { title: string; rows: string[] }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/30 p-3">
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {title}
    </div>
    {rows.length === 0 ? (
      <div className="text-xs text-muted-foreground">Non renseigne.</div>
    ) : (
      <ul className="space-y-1 text-xs text-muted-foreground">
        {rows.map((row) => <li key={row}>{row}</li>)}
      </ul>
    )}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <Card className="border-gold/10 bg-noir/40">
    <CardContent className="flex min-h-[140px] items-center justify-center text-muted-foreground">
      <Database className="mr-2 h-5 w-5 text-primary" />
      {text}
    </CardContent>
  </Card>
);
