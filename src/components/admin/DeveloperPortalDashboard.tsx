import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BookOpen, Braces, Code2, FileClock, Gauge, KeyRound, Loader2, Play, RefreshCw, Rocket, Shield, TerminalSquare } from "lucide-react";
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
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Overview = {
  active_developers: number;
  active_apps: number;
  active_api_keys: number;
  sandbox_runs_24h: number;
  api_requests_24h: number;
  api_errors_24h: number;
  open_support_tickets: number;
};

type AppRow = {
  id: string;
  app_key: string;
  app_name: string;
  environment: string;
  status: string;
  allowed_modules: string[];
  allowed_endpoint_keys: string[];
  quota_per_minute: number;
  quota_per_day: number;
  created_at: string;
};

type ApiKeyRow = {
  id: string;
  key_name: string;
  key_prefix: string;
  owner_label: string | null;
  status: string;
  allowed_endpoint_keys: string[];
  allowed_modules: string[];
  last_used_at: string | null;
  created_at: string;
  app_key: string | null;
};

type DocRow = {
  item_type: string;
  item_key: string;
  section: string;
  title: string;
  summary: string;
  version: string;
  status: string;
  source_module_key: string | null;
};

type SdkRow = {
  id: string;
  sdk_key: string;
  language: string;
  package_name: string;
  version: string;
  status: string;
  documentation_path: string | null;
  capabilities: string[];
};

type SandboxRun = {
  id: string;
  app_key: string | null;
  app_name: string | null;
  scenario_key: string;
  status: string;
  latency_ms: number;
  created_at: string;
  response_payload: Record<string, unknown>;
};

type Changelog = {
  id: string;
  entry_key: string;
  version: string;
  entry_type: string;
  title: string;
  description: string;
  impact_level: string;
  published_at: string;
};

type Finding = {
  finding_type: string;
  severity: string;
  subject_key: string;
  detail: string;
};

type OpenApiRow = {
  spec: Record<string, unknown>;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const n = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR");
const date = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("fr-FR") : "Jamais");

export default function DeveloperPortalDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [sdks, setSdks] = useState<SdkRow[]>([]);
  const [runs, setRuns] = useState<SandboxRun[]>([]);
  const [changelog, setChangelog] = useState<Changelog[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [openApi, setOpenApi] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingApp, setWorkingApp] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [overviewResult, appsResult, keysResult, docsResult, sdkResult, runsResult, changelogResult, findingsResult, openApiResult] = await Promise.all([
      db.from("admin_developer_portal_overview").select("*").maybeSingle(),
      db.from("admin_developer_portal_apps").select("*").order("created_at", { ascending: false }).limit(120),
      db.from("admin_developer_portal_api_keys").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("developer_portal_docs_catalog").select("*").order("section").limit(240),
      db.from("developer_portal_sdk_packages_view").select("*").order("language").limit(50),
      db.from("developer_portal_sandbox_runs_view").select("*").order("created_at", { ascending: false }).limit(120),
      db.from("developer_portal_changelog").select("*").order("published_at", { ascending: false }).limit(80),
      db.from("admin_developer_portal_security_findings").select("*").order("severity", { ascending: false }).limit(100),
      db.from("developer_portal_openapi").select("*").maybeSingle(),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!appsResult.error) setApps(toArray<AppRow>(appsResult.data));
    if (!keysResult.error) setKeys(toArray<ApiKeyRow>(keysResult.data));
    if (!docsResult.error) setDocs(toArray<DocRow>(docsResult.data));
    if (!sdkResult.error) setSdks(toArray<SdkRow>(sdkResult.data));
    if (!runsResult.error) setRuns(toArray<SandboxRun>(runsResult.data));
    if (!changelogResult.error) setChangelog(toArray<Changelog>(changelogResult.data));
    if (!findingsResult.error) setFindings(toArray<Finding>(findingsResult.data));
    if (!openApiResult.error) setOpenApi(((openApiResult.data as OpenApiRow | null)?.spec as Record<string, unknown>) ?? null);

    const firstError = [overviewResult, appsResult, keysResult, docsResult, sdkResult, runsResult, changelogResult, findingsResult, openApiResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "Developer Portal indisponible", description: firstError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const runSandbox = async (app: AppRow) => {
    setWorkingApp(app.id);
    const { error } = await db.rpc("developer_run_sandbox", {
      _app_id: app.id,
      _scenario_key: "gateway.ping",
      _payload: { source: "admin_dashboard", expected_side_effects: "none" },
    });
    setWorkingApp(null);
    if (error) {
      toast({ title: "Sandbox indisponible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sandbox executee", description: app.app_key });
    await loadData();
  };

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Developer Portal...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P4.4 Developer Portal & SDK</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Portail developpeur pour documentation, cles API, SDK TypeScript, sandbox, changelog et suivi des integrations.
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
            <Shield className="h-5 w-5" />
            Isolation P0 stricte
          </div>
          <p className="text-sm text-muted-foreground">
            Le portail expose documentation, sandbox et cles API. Il ne modifie jamais wallets, commissions, commandes, paiements, retraits, ledger ou snapshots financiers.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Developpeurs actifs" value={overview?.active_developers || 0} icon={<Code2 className="h-5 w-5" />} />
        <Metric label="Apps actives" value={overview?.active_apps || 0} icon={<Rocket className="h-5 w-5" />} />
        <Metric label="Cles API actives" value={overview?.active_api_keys || 0} icon={<KeyRound className="h-5 w-5" />} />
        <Metric label="Sandbox 24h" value={overview?.sandbox_runs_24h || 0} icon={<Play className="h-5 w-5" />} />
      </div>

      {findings.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Points de vigilance
            </CardTitle>
            <CardDescription>Controle des apps, cles, quotas et SDK.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {findings.map((finding) => (
              <div key={`${finding.finding_type}-${finding.subject_key}`} className="rounded-lg border border-amber-500/20 bg-noir/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cream">{finding.subject_key}</span>
                  <Badge variant="outline">{finding.severity}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{finding.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="docs" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="docs">Documentation</TabsTrigger>
          <TabsTrigger value="apps">Apps & cles</TabsTrigger>
          <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
          <TabsTrigger value="sdk">SDK</TabsTrigger>
          <TabsTrigger value="openapi">OpenAPI</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><BookOpen className="h-5 w-5 text-primary" /> Catalogue documentaire</CardTitle>
              <CardDescription>Documentation consolidee depuis P4.1, P4.2 et P4.3.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {docs.map((doc) => (
                <div key={`${doc.item_type}-${doc.item_key}`} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-cream">{doc.title}</div>
                    <Badge variant="outline">{doc.item_type}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{doc.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{doc.section}</Badge>
                    <Badge variant="outline">{doc.version}</Badge>
                    {doc.source_module_key && <Badge variant="outline">{doc.source_module_key}</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><Rocket className="h-5 w-5 text-primary" /> Applications</CardTitle>
                <CardDescription>Apps developpeur, environnements, quotas et scopes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apps.map((app) => (
                  <div key={app.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-cream">{app.app_name}</span>
                          <Badge variant="outline">{app.environment}</Badge>
                          <Badge>{app.status}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{app.app_key}</div>
                        <div className="mt-2 text-xs text-muted-foreground">Quota: {n(app.quota_per_minute)}/min - {n(app.quota_per_day)}/jour</div>
                      </div>
                      <Button size="sm" variant="outline" disabled={workingApp === app.id} onClick={() => runSandbox(app)} className="border-gold/30">
                        {workingApp === app.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Tester
                      </Button>
                    </div>
                  </div>
                ))}
                {apps.length === 0 && <EmptyState message="Aucune application developpeur enregistree." />}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><KeyRound className="h-5 w-5 text-primary" /> Cles API</CardTitle>
                <CardDescription>Secrets jamais exposes apres creation. Seuls prefixes et statuts sont visibles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {keys.map((key) => (
                  <div key={key.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-cream">{key.key_name}</span>
                      <Badge variant={key.status === "active" ? "default" : "outline"}>{key.status}</Badge>
                    </div>
                    <div className="mt-1 font-mono text-sm text-primary">{key.key_prefix}...</div>
                    <div className="mt-2 text-xs text-muted-foreground">App: {key.app_key || key.owner_label || "non liee"} - derniere utilisation: {date(key.last_used_at)}</div>
                  </div>
                ))}
                {keys.length === 0 && <EmptyState message="Aucune cle API developpeur active." />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sandbox">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><TerminalSquare className="h-5 w-5 text-primary" /> Runs sandbox</CardTitle>
              <CardDescription>Scenarios simules, sans effet de bord production.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-cream">{run.scenario_key}</div>
                    <Badge>{run.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{run.app_key || "app inconnue"} - {date(run.created_at)} - {n(run.latency_ms)} ms</div>
                  <pre className="mt-3 max-h-36 overflow-auto rounded bg-black/30 p-3 text-xs text-muted-foreground">{JSON.stringify(run.response_payload, null, 2)}</pre>
                </div>
              ))}
              {runs.length === 0 && <EmptyState message="Aucun run sandbox encore enregistre." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdk">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Braces className="h-5 w-5 text-primary" /> SDK officiels</CardTitle>
              <CardDescription>TypeScript en alpha, architecture preparee pour PHP, Python, Java, Go et C#.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {sdks.map((sdk) => (
                <div key={sdk.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-cream">{sdk.package_name}</div>
                      <div className="text-sm text-muted-foreground">{sdk.language} - {sdk.version}</div>
                    </div>
                    <Badge>{sdk.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sdk.capabilities.map((capability) => <Badge key={capability} variant="outline">{capability}</Badge>)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="openapi">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Gauge className="h-5 w-5 text-primary" /> OpenAPI generee</CardTitle>
              <CardDescription>Specification issue du registre API Gateway.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[520px] overflow-auto rounded-lg border border-gold/10 bg-black/40 p-4 text-xs text-muted-foreground">
                {JSON.stringify(openApi || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><FileClock className="h-5 w-5 text-primary" /> Changelog</CardTitle>
              <CardDescription>Evolutions API, SDK, webhooks et documentation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {changelog.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-cream">{entry.title}</div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{entry.version}</Badge>
                      <Badge>{entry.impact_level}</Badge>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{entry.description}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{entry.entry_type} - {date(entry.published_at)}</div>
                </div>
              ))}
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
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-cream">{n(value)}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 p-6 text-center text-sm text-muted-foreground">{message}</div>;
}
