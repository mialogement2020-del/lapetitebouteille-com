import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Cable, CheckCircle2, Clock, FileClock, Gauge, Loader2, PlugZap, RefreshCw, Shield, Shuffle, SlidersHorizontal } from "lucide-react";
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
  connectors_count: number;
  enabled_connectors_count: number;
  healthy_connectors_count: number;
  unhealthy_connectors_count: number;
  queued_sync_count: number;
  running_sync_count: number;
  sync_runs_24h: number;
  failed_syncs_24h: number;
  open_compatibility_findings: number;
};

type Connector = {
  id: string;
  connector_key: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  version: string;
  status: string;
  environment: string;
  documentation_url: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  health_status: string;
  health_score: number;
  capabilities_used: string[];
  events_consumed: string[];
  events_produced: string[];
  feature_flag_key: string | null;
  config_count: number;
  active_job_count: number;
  open_finding_count: number;
};

type SyncJob = {
  id: string;
  connector_key: string;
  connector_name: string;
  sync_type: string;
  status: string;
  scheduled_for: string;
  attempt_count: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
};

type SyncRun = {
  id: string;
  connector_key: string | null;
  connector_name: string | null;
  run_status: string;
  duration_ms: number | null;
  records_read: number;
  records_written: number;
  records_failed: number;
  health_after: string | null;
  error_code: string | null;
  created_at: string;
};

type Finding = {
  id: string;
  connector_key: string;
  connector_name: string | null;
  severity: string;
  finding_type: string;
  detail: string;
  required_action: string | null;
  status: string;
};

type LifecycleEvent = {
  id: number;
  connector_key: string;
  event_type: string;
  reason: string | null;
  created_at: string;
};

type SecurityFinding = {
  finding_type: string;
  severity: string;
  connector_key: string;
  detail: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const number = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR");
const date = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("fr-FR") : "Non planifie");

export default function IntegrationHubDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingConnector, setWorkingConnector] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [overviewResult, connectorsResult, jobsResult, runsResult, findingsResult, eventsResult, securityResult] = await Promise.all([
      db.from("admin_integration_hub_overview").select("*").maybeSingle(),
      db.from("admin_integration_hub_connectors").select("*").order("connector_key").limit(160),
      db.from("admin_integration_hub_sync_jobs").select("*").order("scheduled_for", { ascending: false }).limit(140),
      db.from("admin_integration_hub_sync_runs").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_integration_hub_compatibility_findings").select("*").order("created_at", { ascending: false }).limit(140),
      db.from("admin_integration_hub_lifecycle_events").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_integration_hub_security_findings").select("*").order("severity", { ascending: false }).limit(100),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!connectorsResult.error) setConnectors(toArray<Connector>(connectorsResult.data));
    if (!jobsResult.error) setJobs(toArray<SyncJob>(jobsResult.data));
    if (!runsResult.error) setRuns(toArray<SyncRun>(runsResult.data));
    if (!findingsResult.error) setFindings(toArray<Finding>(findingsResult.data));
    if (!eventsResult.error) setEvents(toArray<LifecycleEvent>(eventsResult.data));
    if (!securityResult.error) setSecurityFindings(toArray<SecurityFinding>(securityResult.data));

    const firstError = [overviewResult, connectorsResult, jobsResult, runsResult, findingsResult, eventsResult, securityResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "Integration Hub indisponible", description: firstError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const checkCompatibility = async (connector: Connector) => {
    setWorkingConnector(connector.connector_key);
    const { error } = await db.rpc("admin_check_integration_connector_compatibility", {
      _connector_key: connector.connector_key,
    });
    setWorkingConnector(null);
    if (error) {
      toast({ title: "Controle impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Compatibilite controlee", description: connector.connector_key });
    await loadData();
  };

  const scheduleTestSync = async (connector: Connector) => {
    setWorkingConnector(connector.connector_key);
    const { error } = await db.rpc("admin_schedule_integration_connector_sync", {
      _connector_key: connector.connector_key,
      _sync_type: "test",
      _scheduled_for: new Date().toISOString(),
      _payload: { source: "admin_dashboard", mode: "dry_run" },
    });
    setWorkingConnector(null);
    if (error) {
      toast({ title: "Synchronisation non planifiee", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sync test planifiee", description: connector.connector_key });
    await loadData();
  };

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de l'Integration Hub...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P4.3 Integration Hub</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Framework generique pour declarer, configurer, surveiller et planifier les futurs connecteurs LPB sans developper de connecteur metier specifique.
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
            P4.3 gere uniquement l'infrastructure de connecteurs. Aucun wallet, commission, commande, paiement, retrait, ledger ou snapshot financier n'est modifie.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Connecteurs" value={overview?.connectors_count || 0} icon={<Cable className="h-5 w-5" />} />
        <Metric label="Actifs" value={overview?.enabled_connectors_count || 0} icon={<PlugZap className="h-5 w-5" />} />
        <Metric label="Sync 24h" value={overview?.sync_runs_24h || 0} icon={<Activity className="h-5 w-5" />} />
        <Metric label="Alertes compatibilite" value={overview?.open_compatibility_findings || 0} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {securityFindings.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Points de vigilance
            </CardTitle>
            <CardDescription>Controle configuration, rollout progressif et sante connecteur.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {securityFindings.map((finding) => (
              <div key={`${finding.finding_type}-${finding.connector_key}`} className="rounded-lg border border-amber-500/20 bg-noir/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cream">{finding.connector_key}</span>
                  <Badge variant="outline">{finding.severity}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{finding.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="connectors" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="connectors">Connecteurs</TabsTrigger>
          <TabsTrigger value="sync">Synchronisations</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibilite</TabsTrigger>
          <TabsTrigger value="health">Sante</TabsTrigger>
          <TabsTrigger value="logs">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Cable className="h-5 w-5 text-primary" />
                Connector Registry
              </CardTitle>
              <CardDescription>Registre central des futurs connecteurs ERP, CRM, paiement, logistique, IA, marketing, BI ou generiques.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectors.length === 0 && <EmptyState message="Aucun connecteur installe. Le framework est pret pour les declarations futures." />}
              {connectors.map((connector) => (
                <div key={connector.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-cream">{connector.name}</span>
                        <Badge className={statusClass(connector.status)}>{connector.status}</Badge>
                        <Badge variant="outline">{connector.category}</Badge>
                        <Badge variant="outline">{connector.environment}</Badge>
                      </div>
                      <p className="max-w-4xl text-sm text-muted-foreground">{connector.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{connector.connector_key}</span>
                        <span>Provider: {connector.provider}</span>
                        <span>Version: {connector.version}</span>
                        <span>Configs: {connector.config_count}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={workingConnector === connector.connector_key} onClick={() => checkCompatibility(connector)}>
                        <Shuffle className="mr-2 h-4 w-4" />
                        Compatibilite
                      </Button>
                      <Button size="sm" variant="outline" disabled={workingConnector === connector.connector_key || !["enabled", "experimental"].includes(connector.status)} onClick={() => scheduleTestSync(connector)}>
                        <Clock className="mr-2 h-4 w-4" />
                        Sync test
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><Clock className="h-5 w-5 text-primary" /> Jobs planifies</CardTitle>
                <CardDescription>File de synchronisations manuelles, differees, incrementales ou de test.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.length === 0 && <EmptyState message="Aucun job de synchronisation en attente." />}
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-cream">{job.connector_key}</div>
                        <div className="text-sm text-muted-foreground">{job.sync_type} - {date(job.scheduled_for)}</div>
                      </div>
                      <Badge variant="outline">{job.status}</Badge>
                    </div>
                    {job.error_message && <div className="mt-2 text-sm text-red-200">{job.error_code}: {job.error_message}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream"><FileClock className="h-5 w-5 text-primary" /> Executions recentes</CardTitle>
                <CardDescription>Historique append-only des synchronisations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {runs.length === 0 && <EmptyState message="Aucune execution enregistree." />}
                {runs.map((run) => (
                  <div key={run.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-cream">{run.connector_key || "Connecteur supprime"}</div>
                        <div className="text-sm text-muted-foreground">{date(run.created_at)} - {run.records_read} lus / {run.records_written} ecrits / {run.records_failed} erreurs</div>
                      </div>
                      <Badge className={statusClass(run.run_status)}>{run.run_status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compatibility">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><SlidersHorizontal className="h-5 w-5 text-primary" /> Compatibilite</CardTitle>
              <CardDescription>Controle des capabilities, events, versions et contrats requis par les connecteurs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {findings.length === 0 && <EmptyState message="Aucune incompatibilite ouverte." />}
              {findings.map((finding) => (
                <div key={finding.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-cream">{finding.connector_key} - {finding.finding_type}</div>
                      <div className="text-sm text-muted-foreground">{finding.detail}</div>
                      {finding.required_action && <div className="mt-1 text-sm text-amber-200">{finding.required_action}</div>}
                    </div>
                    <Badge variant="outline">{finding.severity}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><Gauge className="h-5 w-5 text-primary" /> Connector Health</CardTitle>
              <CardDescription>Sante calculee avec disponibilite, erreurs, latence, syncs et retries.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {connectors.length === 0 && <EmptyState message="Aucun score de sante a afficher." />}
              {connectors.map((connector) => (
                <div key={connector.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-cream">{connector.connector_key}</span>
                    <Badge className={healthClass(connector.health_status)}>{connector.health_status}</Badge>
                  </div>
                  <div className="mt-4 text-3xl font-bold text-primary">{number(connector.health_score)} %</div>
                  <div className="mt-3 h-2 rounded-full bg-cream/10">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, connector.health_score))}%` }} />
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">Derniere sync: {date(connector.last_sync_at)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream"><FileClock className="h-5 w-5 text-primary" /> Journal append-only</CardTitle>
              <CardDescription>Installation, activation, configuration, synchronisation, erreurs, retries et changements de sante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 && <EmptyState message="Aucun evenement de cycle de vie enregistre." />}
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border border-gold/10 bg-noir-light/40 p-3">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-cream">{event.connector_key} - {event.event_type}</div>
                      <div className="text-sm text-muted-foreground">{event.reason || "Sans note"}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{date(event.created_at)}</div>
                  </div>
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
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold text-cream">{number(value)}</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gold/20 bg-noir-light/30 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function statusClass(status: string) {
  if (["enabled", "succeeded", "healthy"].includes(status)) return "bg-emerald-500/15 text-emerald-200";
  if (["disabled", "cancelled", "installed"].includes(status)) return "bg-muted text-muted-foreground";
  if (["failed", "critical"].includes(status)) return "bg-red-500/15 text-red-200";
  return "bg-amber-500/15 text-amber-200";
}

function healthClass(status: string) {
  if (status === "healthy") return "bg-emerald-500/15 text-emerald-200";
  if (status === "critical") return "bg-red-500/15 text-red-200";
  return "bg-amber-500/15 text-amber-200";
}
