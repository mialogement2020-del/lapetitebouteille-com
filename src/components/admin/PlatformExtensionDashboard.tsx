import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Boxes, CheckCircle2, FileCode2, Flag, GitBranch, Loader2, Network, RefreshCw, Route, Shield, Zap } from "lucide-react";
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
  modules_count: number;
  active_modules_count: number;
  active_capabilities_count: number;
  active_events_count: number;
  documented_rpc_count: number;
  documented_edge_functions_count: number;
  active_flags_count: number;
  active_tasks_count: number;
};

type ModuleRow = {
  id: string;
  module_key: string;
  name: string;
  description: string;
  version: string;
  status: string;
  logical_owner: string;
  dependencies: string[];
  provided_capabilities: string[];
  routes: string[];
  rpc_functions: string[];
  edge_functions: string[];
  documentation_path: string | null;
  can_be_disabled: boolean;
};

type CapabilityRow = {
  id: string;
  capability_key: string;
  module_key: string;
  module_name: string;
  description: string;
  version: string;
  access_type: string;
  status: string;
  required_permission: string | null;
};

type EventRow = {
  id: string;
  event_key: string;
  version: string;
  producer_module_key: string;
  producer_module_name: string;
  description: string;
  sensitivity_level: string;
  retention_policy: string;
  status: string;
  known_consumers: string[];
};

type ContractRow = {
  contract_type: string;
  contract_name: string;
  module_key: string;
  purpose: string;
  version: string;
  status: string;
  required_permissions: string[];
  documentation_path: string | null;
};

type FlagRow = {
  id: string;
  flag_key: string;
  module_key: string;
  description: string;
  status: string;
  environment: string;
  rollout_percent: number;
  allowed_roles: string[];
};

type AlertRow = {
  alert_type: string;
  severity: string;
  module_key: string;
  title: string;
  detail: string;
};

type TaskRow = {
  id: string;
  task_key: string;
  module_key: string;
  module_name: string;
  description: string;
  frequency: string;
  invoked_function: string;
  status: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const number = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR");

export default function PlatformExtensionDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingFlag, setWorkingFlag] = useState<string | null>(null);

  const p0Module = useMemo(() => modules.find((module) => module.module_key === "p0_finance_observation"), [modules]);

  const loadData = async () => {
    setLoading(true);
    const [overviewResult, modulesResult, capabilitiesResult, eventsResult, contractsResult, flagsResult, tasksResult, alertsResult] = await Promise.all([
      db.from("admin_platform_extension_overview").select("*").maybeSingle(),
      db.from("admin_platform_extension_modules").select("*").order("module_key").limit(100),
      db.from("admin_platform_capabilities").select("*").order("capability_key").limit(200),
      db.from("admin_platform_event_catalog").select("*").order("event_key").limit(200),
      db.from("admin_platform_contracts").select("*").order("contract_name").limit(240),
      db.from("admin_platform_feature_flags").select("*").order("flag_key").limit(120),
      db.from("admin_platform_scheduled_tasks").select("*").order("task_key").limit(120),
      db.from("admin_platform_compatibility_alerts").select("*").order("severity", { ascending: false }).limit(120),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!modulesResult.error) setModules(toArray<ModuleRow>(modulesResult.data));
    if (!capabilitiesResult.error) setCapabilities(toArray<CapabilityRow>(capabilitiesResult.data));
    if (!eventsResult.error) setEvents(toArray<EventRow>(eventsResult.data));
    if (!contractsResult.error) setContracts(toArray<ContractRow>(contractsResult.data));
    if (!flagsResult.error) setFlags(toArray<FlagRow>(flagsResult.data));
    if (!tasksResult.error) setTasks(toArray<TaskRow>(tasksResult.data));
    if (!alertsResult.error) setAlerts(toArray<AlertRow>(alertsResult.data));

    const firstError = [overviewResult, modulesResult, capabilitiesResult, eventsResult, contractsResult, flagsResult, tasksResult, alertsResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "Framework d'extension indisponible", description: firstError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleFlag = async (flag: FlagRow) => {
    const nextStatus = flag.status === "enabled" ? "disabled" : "enabled";
    setWorkingFlag(flag.flag_key);
    const { error } = await db.rpc("set_platform_feature_flag", {
      _flag_key: flag.flag_key,
      _status: nextStatus,
      _reason: `Toggle depuis le dashboard P4.1 vers ${nextStatus}`,
      _eligibility_rules: null,
      _rollout_percent: null,
    });
    setWorkingFlag(null);
    if (error) {
      toast({ title: "Feature flag non modifie", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Feature flag mis a jour", description: `${flag.flag_key} -> ${nextStatus}` });
    await loadData();
  };

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Platform Extension Framework...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P4.1 Platform Extension Framework</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Registres, contrats, evenements, flags et conventions pour faire evoluer LPB sans fragiliser l'existant.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-red-200">
              <Shield className="h-5 w-5" />
              Isolation P0 stricte
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {p0Module?.description || "P4.1 documente le P0 mais ne modifie jamais les flux financiers."}
            </p>
          </div>
          <Badge className="bg-red-500/15 text-red-200">{p0Module?.status || "observation"}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Modules declares" value={overview?.modules_count || 0} icon={<Boxes className="h-5 w-5" />} />
        <MetricCard label="Capacites actives" value={overview?.active_capabilities_count || 0} icon={<Zap className="h-5 w-5" />} />
        <MetricCard label="Evenements actifs" value={overview?.active_events_count || 0} icon={<Network className="h-5 w-5" />} />
        <MetricCard label="Contrats documentes" value={(overview?.documented_rpc_count || 0) + (overview?.documented_edge_functions_count || 0)} icon={<FileCode2 className="h-5 w-5" />} />
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Alertes de compatibilite
            </CardTitle>
            <CardDescription>Ces alertes sont declaratives et ne bloquent pas l'execution.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {alerts.map((alert) => (
              <div key={`${alert.alert_type}-${alert.module_key}-${alert.detail}`} className="rounded-lg border border-amber-500/20 bg-noir/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cream">{alert.title}</span>
                  <Badge variant="outline">{alert.severity}</Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{alert.module_key} - {alert.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="capabilities">Capacites</TabsTrigger>
          <TabsTrigger value="events">Evenements</TabsTrigger>
          <TabsTrigger value="contracts">Contrats</TabsTrigger>
          <TabsTrigger value="tasks">Taches</TabsTrigger>
          <TabsTrigger value="flags">Flags</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="grid gap-4 xl:grid-cols-2">
          {modules.map((module) => (
            <Card key={module.id} className="border-gold/10 bg-noir/50">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-cream">{module.name}</CardTitle>
                  <StatusBadge status={module.status} />
                </div>
                <CardDescription>{module.module_key} - {module.version} - {module.logical_owner}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{module.description}</p>
                <ChipList label="Dependances" values={module.dependencies} />
                <ChipList label="Routes" values={module.routes} />
                <ChipList label="RPC" values={module.rpc_functions} />
                <ChipList label="Edge" values={module.edge_functions} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-2">
          {capabilities.map((capability) => (
            <Row key={capability.id} icon={<Zap className="h-4 w-4" />} title={capability.capability_key} subtitle={`${capability.module_name} - ${capability.description}`}>
              <Badge variant="outline">{capability.access_type}</Badge>
              <StatusBadge status={capability.status} />
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="events" className="space-y-2">
          {events.map((event) => (
            <Row key={event.id} icon={<Network className="h-4 w-4" />} title={`${event.event_key} ${event.version}`} subtitle={`${event.producer_module_name} - ${event.description}`}>
              <Badge variant="outline">{event.sensitivity_level}</Badge>
              <Badge variant="outline">{event.retention_policy}</Badge>
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-2">
          {contracts.map((contract) => (
            <Row key={`${contract.contract_type}-${contract.contract_name}`} icon={<FileCode2 className="h-4 w-4" />} title={contract.contract_name} subtitle={`${contract.contract_type} - ${contract.module_key} - ${contract.purpose}`}>
              <Badge variant="outline">{contract.version}</Badge>
              <StatusBadge status={contract.status} />
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {tasks.map((task) => (
            <Row key={task.id} icon={<Route className="h-4 w-4" />} title={task.task_key} subtitle={`${task.module_name} - ${task.description}`}>
              <Badge variant="outline">{task.frequency}</Badge>
              <StatusBadge status={task.status} />
            </Row>
          ))}
        </TabsContent>

        <TabsContent value="flags" className="space-y-2">
          {flags.map((flag) => (
            <Row key={flag.id} icon={<Flag className="h-4 w-4" />} title={flag.flag_key} subtitle={`${flag.module_key} - ${flag.description}`}>
              <Badge variant="outline">{flag.environment}</Badge>
              <Badge variant="outline">{number(flag.rollout_percent)}%</Badge>
              <Button size="sm" variant="outline" disabled={workingFlag === flag.flag_key} onClick={() => toggleFlag(flag)}>
                {workingFlag === flag.flag_key ? <Loader2 className="h-4 w-4 animate-spin" /> : flag.status === "enabled" ? "Desactiver" : "Activer"}
              </Button>
              <StatusBadge status={flag.status} />
            </Row>
          ))}
        </TabsContent>
      </Tabs>

      <Card className="border-gold/20 bg-noir/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream">
            <GitBranch className="h-5 w-5 text-primary" />
            Documentation vivante
          </CardTitle>
          <CardDescription>La source documentaire P4.1 se trouve dans docs/architecture.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <DocLink label="Module Registry" path="docs/architecture/module-registry.md" />
          <DocLink label="Capability Registry" path="docs/architecture/capability-registry.md" />
          <DocLink label="ADR Index" path="docs/architecture/adr/README.md" />
        </CardContent>
      </Card>
    </div>
  );
}

const MetricCard = ({ label, value, icon }: { label: string; value: number; icon: ReactNode }) => (
  <Card className="border-gold/20 bg-noir/60">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-bold text-cream">{number(value)}</div>
      </div>
      <div className="rounded-full bg-gold/10 p-3 text-primary">{icon}</div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const className = status === "active" || status === "enabled"
    ? "bg-emerald-500/15 text-emerald-300"
    : status === "observation" || status === "limited" || status === "experimental"
      ? "bg-amber-500/15 text-amber-300"
      : status === "disabled" || status === "deprecated"
        ? "bg-red-500/15 text-red-300"
        : "bg-gold/10 text-primary";
  return <Badge className={className}>{status}</Badge>;
};

const ChipList = ({ label, values }: { label: string; values: string[] }) => (
  <div>
    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="flex flex-wrap gap-1">
      {values.length === 0 ? <span className="text-xs text-muted-foreground">Aucun</span> : values.slice(0, 8).map((value) => (
        <Badge key={value} variant="outline" className="max-w-[220px] truncate">{value}</Badge>
      ))}
      {values.length > 8 && <Badge variant="outline">+{values.length - 8}</Badge>}
    </div>
  </div>
);

const Row = ({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) => (
  <div className="grid gap-3 rounded-lg border border-gold/10 bg-noir/50 p-3 md:grid-cols-[1fr_auto] md:items-center">
    <div className="flex min-w-0 gap-3">
      <div className="mt-1 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="truncate font-medium text-cream">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

const DocLink = ({ label, path }: { label: string; path: string }) => (
  <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
    <div className="flex items-center gap-2 font-medium text-cream">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      {label}
    </div>
    <div className="mt-1 font-mono text-xs text-muted-foreground">{path}</div>
  </div>
);
