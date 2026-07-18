import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, BookOpen, Gauge, Globe2, KeyRound, Loader2, RefreshCw, Route, Send, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
};

type Overview = {
  endpoints_count: number;
  active_endpoints_count: number;
  active_api_keys_count: number;
  active_webhooks_count: number;
  requests_24h: number;
  errors_24h: number;
  webhook_queue_count: number;
  dead_letter_count: number;
};

type Endpoint = {
  id: string;
  endpoint_key: string;
  module_key: string;
  module_name: string;
  capability_name: string | null;
  path: string;
  http_method: string;
  version: string;
  status: string;
  route_type: string;
  target_name: string;
  auth_modes: string[];
  required_roles: string[];
};

type RequestLog = {
  id: number;
  endpoint_key: string | null;
  auth_mode: string;
  http_method: string | null;
  path: string | null;
  status_code: number | null;
  latency_ms: number | null;
  error_code: string | null;
  created_at: string;
};

type WebhookRow = {
  id: string;
  subscription_key: string;
  owner_label: string;
  target_url: string;
  event_keys: string[];
  status: string;
  failure_count: number;
  delivery_count: number;
  failed_delivery_count: number;
};

type DeliveryRow = {
  id: string;
  event_key: string;
  subscription_key: string;
  status: string;
  attempt_count: number;
  next_attempt_at: string;
  last_status_code: number | null;
  last_error: string | null;
};

type RateLimitRow = {
  id: string;
  endpoint_key: string | null;
  identity_type: string;
  identity_value: string;
  request_count: number;
  max_requests: number;
  window_seconds: number;
  updated_at: string;
};

type Finding = {
  finding_type: string;
  severity: string;
  endpoint_key: string;
  detail: string;
};

type OpenApiRow = {
  spec: Record<string, unknown>;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const n = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR");

export default function ApiGatewayDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitRow[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [openApi, setOpenApi] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [overviewResult, endpointsResult, logsResult, webhooksResult, deliveriesResult, rateLimitsResult, findingsResult, openApiResult] = await Promise.all([
      db.from("admin_api_gateway_overview").select("*").maybeSingle(),
      db.from("admin_api_gateway_endpoints").select("*").order("endpoint_key").limit(200),
      db.from("admin_api_gateway_request_logs").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_api_gateway_webhooks").select("*").order("subscription_key").limit(120),
      db.from("admin_api_gateway_webhook_deliveries").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_api_gateway_rate_limits").select("*").order("updated_at", { ascending: false }).limit(120),
      db.from("admin_api_gateway_security_findings").select("*").order("severity", { ascending: false }).limit(120),
      db.from("admin_api_gateway_openapi").select("*").maybeSingle(),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!endpointsResult.error) setEndpoints(toArray<Endpoint>(endpointsResult.data));
    if (!logsResult.error) setLogs(toArray<RequestLog>(logsResult.data));
    if (!webhooksResult.error) setWebhooks(toArray<WebhookRow>(webhooksResult.data));
    if (!deliveriesResult.error) setDeliveries(toArray<DeliveryRow>(deliveriesResult.data));
    if (!rateLimitsResult.error) setRateLimits(toArray<RateLimitRow>(rateLimitsResult.data));
    if (!findingsResult.error) setFindings(toArray<Finding>(findingsResult.data));
    if (!openApiResult.error) setOpenApi(((openApiResult.data as OpenApiRow | null)?.spec as Record<string, unknown>) ?? null);

    const firstError = [overviewResult, endpointsResult, logsResult, webhooksResult, deliveriesResult, rateLimitsResult, findingsResult, openApiResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "API Gateway indisponible", description: firstError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[220px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de l'API Gateway...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P4.2 API & Integration Gateway</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Point d'entree versionne pour integrations, webhooks, quotas, signatures, journaux et documentation API.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center gap-2 font-semibold text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Non-regression P0
          </div>
          <p className="text-sm text-muted-foreground">
            Le gateway journalise, route et documente. Il ne modifie jamais wallets, commissions, commandes, paiements, retraits, ledger ou snapshots financiers.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Endpoints actifs" value={overview?.active_endpoints_count || 0} icon={<Route className="h-5 w-5" />} />
        <Metric label="Requetes 24h" value={overview?.requests_24h || 0} icon={<Activity className="h-5 w-5" />} />
        <Metric label="Erreurs 24h" value={overview?.errors_24h || 0} icon={<AlertTriangle className="h-5 w-5" />} />
        <Metric label="Webhooks actifs" value={overview?.active_webhooks_count || 0} icon={<Webhook className="h-5 w-5" />} />
      </div>

      {findings.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Points de vigilance
            </CardTitle>
            <CardDescription>Alertes declaratives de securite et coherence API.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {findings.map((finding) => (
              <div key={`${finding.finding_type}-${finding.endpoint_key}`} className="rounded-lg border border-amber-500/20 bg-noir/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cream">{finding.endpoint_key}</span>
                  <Badge variant="outline">{finding.severity}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{finding.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="openapi">OpenAPI</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Globe2 className="h-5 w-5 text-primary" /> Registre API</CardTitle>
              <CardDescription>Endpoints declares via P4.1, versionnes et soumis a permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary text-noir">{endpoint.http_method}</Badge>
                        <span className="font-semibold text-cream">{endpoint.path}</span>
                        <Badge variant="outline">{endpoint.version}</Badge>
                        <Badge variant={endpoint.status === "active" ? "default" : "outline"}>{endpoint.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{endpoint.endpoint_key} - {endpoint.module_name}</div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{endpoint.route_type}</div>
                      <div>{endpoint.target_name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Activity className="h-5 w-5 text-primary" /> Journaux Gateway</CardTitle>
              <CardDescription>Historique append-only des appels gateway.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="grid gap-2 rounded-lg border border-gold/10 bg-noir-light/40 p-3 text-sm md:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr]">
                  <div>
                    <div className="font-medium text-cream">{log.endpoint_key || log.path}</div>
                    <div className="text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                  <div>{log.http_method}</div>
                  <div>{log.status_code ?? "-"}</div>
                  <div>{log.latency_ms ?? 0} ms</div>
                </div>
              ))}
              {logs.length === 0 && <Empty label="Aucun appel gateway journalise pour le moment." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><Webhook className="h-5 w-5 text-primary" /> Abonnements</CardTitle>
                <CardDescription>Signatures, retries et desactivation automatique apres echecs repetes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-cream">{webhook.subscription_key}</span>
                      <Badge>{webhook.status}</Badge>
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{webhook.target_url}</div>
                    <div className="mt-2 text-sm text-muted-foreground">{webhook.delivery_count} livraisons - {webhook.failed_delivery_count} echecs</div>
                  </div>
                ))}
                {webhooks.length === 0 && <Empty label="Aucun webhook configure." />}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><Send className="h-5 w-5 text-primary" /> Livraisons recentes</CardTitle>
                <CardDescription>Queue et historique des retries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-cream">{delivery.event_key}</span>
                      <Badge variant="outline">{delivery.status}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">{delivery.subscription_key} - tentative {delivery.attempt_count}</div>
                  </div>
                ))}
                {deliveries.length === 0 && <Empty label="Aucune livraison enregistree." />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quotas">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Gauge className="h-5 w-5 text-primary" /> Rate Limiting</CardTitle>
              <CardDescription>Buckets par endpoint et identite.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {rateLimits.map((bucket) => (
                <div key={bucket.id} className="grid gap-2 rounded-lg border border-gold/10 bg-noir-light/40 p-3 text-sm md:grid-cols-[1.4fr_1fr_1fr_0.7fr]">
                  <div className="font-medium text-cream">{bucket.endpoint_key || "global"}</div>
                  <div>{bucket.identity_type}</div>
                  <div className="truncate">{bucket.identity_value}</div>
                  <div>{bucket.request_count}/{bucket.max_requests}</div>
                </div>
              ))}
              {rateLimits.length === 0 && <Empty label="Aucun bucket de quota actif." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="openapi">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><BookOpen className="h-5 w-5 text-primary" /> Documentation OpenAPI</CardTitle>
              <CardDescription>Spec generee depuis le registre API. Version source : docs/api/openapi-lpb-gateway.json.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[460px] overflow-auto rounded-lg border border-gold/10 bg-black/40 p-4 text-xs text-cream">
                {JSON.stringify(openApi || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card className="border-gold/20 bg-noir/60">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold text-cream">{n(value)}</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gold/20 p-6 text-center text-sm text-muted-foreground">
      <KeyRound className="mx-auto mb-2 h-5 w-5 text-primary" />
      {label}
    </div>
  );
}
