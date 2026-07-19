import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  History,
  Loader2,
  PackageCheck,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldCheck,
  Store,
  ToggleLeft,
} from "lucide-react";
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
  extensions_count: number;
  published_extensions_count: number;
  installed_extensions_count: number;
  blocked_versions_count: number;
  open_findings_count: number;
  operations_24h: number;
  sandbox_runs_24h: number;
};

type ExtensionRow = {
  id: string;
  extension_key: string;
  name: string;
  category: string;
  listing_status: string;
  visibility: string;
  publisher_name: string | null;
  verification_status: string | null;
  version_count: number;
  installation_count: number;
  open_finding_count: number;
  updated_at: string;
};

type VersionRow = {
  id: string;
  extension_id: string;
  extension_key: string;
  extension_name: string;
  version: string;
  release_status: string;
  requested_permissions: string[];
  required_capabilities: string[];
  required_api_endpoints: string[];
  required_connectors: string[];
  signature_digest: string | null;
  integrity_digest: string | null;
  created_at: string;
};

type InstallationRow = {
  id: string;
  extension_key: string;
  extension_name: string;
  version: string;
  environment: string;
  install_status: string;
  feature_flag_key: string | null;
  last_health_status: string;
  last_health_score: number;
  updated_at: string;
};

type OperationRow = {
  id: number;
  extension_key: string | null;
  extension_name: string | null;
  version: string | null;
  operation_type: string;
  operation_status: string;
  reason: string | null;
  created_at: string;
};

type FindingRow = {
  id?: string;
  extension_key: string | null;
  extension_name?: string | null;
  version?: string | null;
  subject_key?: string;
  finding_type: string;
  severity: string;
  detail: string;
  required_action?: string | null;
  status?: string;
  created_at?: string;
};

type SandboxRunRow = {
  id: string;
  extension_key: string | null;
  extension_name: string | null;
  version: string | null;
  scenario_key: string;
  run_status: string;
  side_effects: string;
  validation_summary: Record<string, unknown>;
  created_at: string;
};

type HealthRow = {
  extension_key: string;
  name: string;
  install_status: string;
  health_status: string;
  health_score: number;
  api_calls_today: number;
  api_errors_today: number;
  avg_latency_ms_today: number;
  blocking_findings: number;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const n = (value: number | null | undefined) => Number(value || 0).toLocaleString("fr-FR");
const date = (value: string | null | undefined) => (value ? new Date(value).toLocaleString("fr-FR") : "Jamais");

const statusTone = (value: string) => {
  if (["published", "approved", "active", "healthy", "completed", "sandbox"].includes(value)) return "border-emerald-500/40 text-emerald-300";
  if (["blocked", "critical", "failed", "suspended"].includes(value)) return "border-red-500/40 text-red-300";
  if (["warning", "review", "submitted", "limited"].includes(value)) return "border-amber-500/40 text-amber-300";
  return "border-muted-foreground/30 text-muted-foreground";
};

export default function ExtensionMarketplaceDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [extensions, setExtensions] = useState<ExtensionRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [installations, setInstallations] = useState<InstallationRow[]>([]);
  const [operations, setOperations] = useState<OperationRow[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [securityFindings, setSecurityFindings] = useState<FindingRow[]>([]);
  const [sandboxRuns, setSandboxRuns] = useState<SandboxRunRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  const publishedRatio = useMemo(() => {
    if (!overview?.extensions_count) return 0;
    return Math.round((overview.published_extensions_count / overview.extensions_count) * 100);
  }, [overview]);

  const loadData = async () => {
    setLoading(true);
    const [overviewResult, catalogResult, versionsResult, installationsResult, operationsResult, findingsResult, securityResult, sandboxResult, healthResult] = await Promise.all([
      db.from("admin_extension_marketplace_overview").select("*").maybeSingle(),
      db.from("admin_extension_marketplace_catalog").select("*").order("updated_at", { ascending: false }).limit(120),
      db.from("admin_extension_marketplace_versions").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_extension_marketplace_installations").select("*").order("updated_at", { ascending: false }).limit(120),
      db.from("admin_extension_marketplace_operations").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_extension_marketplace_findings").select("*").order("created_at", { ascending: false }).limit(160),
      db.from("admin_extension_marketplace_security_findings").select("*").order("severity", { ascending: false }).limit(80),
      db.from("admin_extension_marketplace_sandbox_runs").select("*").order("created_at", { ascending: false }).limit(120),
      db.from("admin_extension_marketplace_health").select("*").order("health_score", { ascending: true }).limit(120),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!catalogResult.error) setExtensions(toArray<ExtensionRow>(catalogResult.data));
    if (!versionsResult.error) setVersions(toArray<VersionRow>(versionsResult.data));
    if (!installationsResult.error) setInstallations(toArray<InstallationRow>(installationsResult.data));
    if (!operationsResult.error) setOperations(toArray<OperationRow>(operationsResult.data));
    if (!findingsResult.error) setFindings(toArray<FindingRow>(findingsResult.data));
    if (!securityResult.error) setSecurityFindings(toArray<FindingRow>(securityResult.data));
    if (!sandboxResult.error) setSandboxRuns(toArray<SandboxRunRow>(sandboxResult.data));
    if (!healthResult.error) setHealth(toArray<HealthRow>(healthResult.data));

    const firstError = [overviewResult, catalogResult, versionsResult, installationsResult, operationsResult, findingsResult, securityResult, sandboxResult, healthResult].find((result) => result.error)?.error;
    if (firstError) {
      toast({ title: "Extension Marketplace indisponible", description: firstError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const callAction = async (key: string, title: string, fn: string, args: Record<string, unknown>) => {
    setWorkingKey(key);
    const { error } = await db.rpc(fn, args);
    setWorkingKey(null);
    if (error) {
      toast({ title, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title, description: "Operation enregistree dans la marketplace." });
    await loadData();
  };

  const validateVersion = (version: VersionRow) =>
    callAction(version.id, "Validation extension", "admin_validate_extension_version", { _version_id: version.id });

  const sandboxVersion = (version: VersionRow) =>
    callAction(version.id, "Sandbox extension", "admin_run_extension_sandbox", { _version_id: version.id, _scenario_key: "marketplace.compatibility.default" });

  const installSandbox = (version: VersionRow) =>
    callAction(version.id, "Installation sandbox", "admin_install_extension", {
      _version_id: version.id,
      _environment: "sandbox",
      _configuration: { source: "admin_extension_marketplace_dashboard", side_effects: "none" },
    });

  const disableInstallation = (installation: InstallationRow) =>
    callAction(installation.id, "Desactivation extension", "admin_set_extension_installation_status", {
      _installation_id: installation.id,
      _status: "disabled",
      _reason: "Disabled from P4.5 admin dashboard",
    });

  const rollbackInstallation = (installation: InstallationRow) => {
    const target = versions.find((version) => version.extension_key === installation.extension_key && version.version !== installation.version && ["approved", "published", "deprecated"].includes(version.release_status));
    if (!target) {
      toast({ title: "Rollback indisponible", description: "Aucune version cible approuvee pour cette extension.", variant: "destructive" });
      return;
    }
    return callAction(installation.id, "Rollback extension", "admin_rollback_extension", {
      _installation_id: installation.id,
      _target_version_id: target.id,
      _reason: `Rollback dashboard vers ${target.version}`,
    });
  };

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de l'Extension Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P4.5 Marketplace App Store</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Catalogue officiel des extensions LPB avec validation, sandbox, installation controlee, rollback, observabilite et journal append-only.
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
            Le marketplace d'extensions installe uniquement des modules via capabilities, API Gateway, connecteurs, events et feature flags. Il ne modifie jamais wallets, commissions, commandes, paiements, retraits, ledger ou snapshots financiers.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Extensions" value={overview?.extensions_count || 0} icon={<Store className="h-5 w-5" />} />
        <Metric label="Publiees" value={`${publishedRatio} %`} icon={<PackageCheck className="h-5 w-5" />} />
        <Metric label="Installees" value={overview?.installed_extensions_count || 0} icon={<Boxes className="h-5 w-5" />} />
        <Metric label="Sandbox 24h" value={overview?.sandbox_runs_24h || 0} icon={<Play className="h-5 w-5" />} />
      </div>

      {(securityFindings.length > 0 || Number(overview?.open_findings_count || 0) > 0) && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Points de vigilance
            </CardTitle>
            <CardDescription>Blocages de securite, signatures manquantes, rollout ou demande de surface financiere interdite.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[...securityFindings, ...findings.slice(0, 4)].slice(0, 8).map((finding, index) => (
              <div key={`${finding.finding_type}-${finding.subject_key || finding.extension_key}-${index}`} className="rounded-lg border border-amber-500/20 bg-noir/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-cream">{finding.subject_key || finding.extension_key || "Extension"}</span>
                  <Badge variant="outline" className={statusTone(finding.severity)}>
                    {finding.severity}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{finding.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="catalog">Catalogue</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="health">Sante</TabsTrigger>
          <TabsTrigger value="operations">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Store className="h-5 w-5 text-primary" />
                Catalogue des extensions
              </CardTitle>
              <CardDescription>Registre officiel, editeurs, statuts, visibilite, installations et findings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {extensions.map((extension) => (
                <div key={extension.id} className="rounded-lg border border-gold/10 bg-noir-light/50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-cream">{extension.name}</span>
                        <Badge variant="outline">{extension.category}</Badge>
                        <Badge variant="outline" className={statusTone(extension.listing_status)}>
                          {extension.listing_status}
                        </Badge>
                        <Badge variant="outline" className={statusTone(extension.visibility)}>
                          {extension.visibility}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {extension.extension_key} - {extension.publisher_name || "Editeur non renseigne"} - MAJ {date(extension.updated_at)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-sm lg:min-w-[360px]">
                      <MiniStat label="Versions" value={extension.version_count} />
                      <MiniStat label="Installs" value={extension.installation_count} />
                      <MiniStat label="Findings" value={extension.open_finding_count} danger={extension.open_finding_count > 0} />
                    </div>
                  </div>
                </div>
              ))}
              {extensions.length === 0 && <EmptyState label="Aucune extension cataloguee pour le moment." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Validation, sandbox et installation
              </CardTitle>
              <CardDescription>Les actions restent journalisees et ne creent aucun effet financier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-lg border border-gold/10 bg-noir-light/50 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-cream">{version.extension_name}</span>
                        <Badge variant="outline">v{version.version}</Badge>
                        <Badge variant="outline" className={statusTone(version.release_status)}>
                          {version.release_status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Capabilities {version.required_capabilities.length} - APIs {version.required_api_endpoints.length} - Connecteurs {version.required_connectors.length} - Creee {date(version.created_at)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!version.signature_digest && <Badge variant="outline" className="border-amber-500/40 text-amber-300">signature manquante</Badge>}
                        {!version.integrity_digest && <Badge variant="outline" className="border-amber-500/40 text-amber-300">integrite manquante</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton icon={<CheckCircle2 className="h-4 w-4" />} label="Valider" busy={workingKey === version.id} onClick={() => validateVersion(version)} />
                      <ActionButton icon={<Play className="h-4 w-4" />} label="Sandbox" busy={workingKey === version.id} onClick={() => sandboxVersion(version)} />
                      <ActionButton icon={<PackageCheck className="h-4 w-4" />} label="Installer sandbox" busy={workingKey === version.id} onClick={() => installSandbox(version)} />
                    </div>
                  </div>
                </div>
              ))}
              {versions.length === 0 && <EmptyState label="Aucune version d'extension a valider." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installations">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Boxes className="h-5 w-5 text-primary" />
                Installations controlees
              </CardTitle>
              <CardDescription>Desactivation, reactivation et rollback restent commandes par admin et feature flags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {installations.map((installation) => (
                <div key={installation.id} className="rounded-lg border border-gold/10 bg-noir-light/50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-cream">{installation.extension_name}</span>
                        <Badge variant="outline">v{installation.version}</Badge>
                        <Badge variant="outline">{installation.environment}</Badge>
                        <Badge variant="outline" className={statusTone(installation.install_status)}>
                          {installation.install_status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Flag {installation.feature_flag_key || "non cree"} - Sante {installation.last_health_status} ({n(installation.last_health_score)} %) - MAJ {date(installation.updated_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton icon={<ToggleLeft className="h-4 w-4" />} label="Desactiver" busy={workingKey === installation.id} onClick={() => disableInstallation(installation)} disabled={installation.install_status === "disabled"} />
                      <ActionButton icon={<RotateCcw className="h-4 w-4" />} label="Rollback" busy={workingKey === installation.id} onClick={() => rollbackInstallation(installation)} />
                    </div>
                  </div>
                </div>
              ))}
              {installations.length === 0 && <EmptyState label="Aucune extension installee." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid gap-4 lg:grid-cols-2">
            {health.map((row) => (
              <Card key={row.extension_key} className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-cream">
                    <span>{row.name}</span>
                    <Badge variant="outline" className={statusTone(row.health_status)}>
                      {row.health_status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{row.extension_key}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <MiniStat label="Score" value={`${n(row.health_score)} %`} danger={row.health_score < 70} />
                  <MiniStat label="API calls" value={row.api_calls_today} />
                  <MiniStat label="Erreurs" value={row.api_errors_today} danger={row.api_errors_today > 0} />
                  <MiniStat label="Findings" value={row.blocking_findings} danger={row.blocking_findings > 0} />
                </CardContent>
              </Card>
            ))}
            {health.length === 0 && <EmptyState label="Aucun indicateur de sante disponible." />}
          </div>
        </TabsContent>

        <TabsContent value="operations">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream">
                  <History className="h-5 w-5 text-primary" />
                  Operations append-only
                </CardTitle>
                <CardDescription>Installation, validation, sandbox, rollback, desactivation et rejet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {operations.slice(0, 18).map((operation) => (
                  <TimelineRow
                    key={operation.id}
                    title={`${operation.operation_type} - ${operation.extension_key || "extension"}`}
                    subtitle={`${operation.operation_status} - ${operation.reason || "Aucune note"} - ${date(operation.created_at)}`}
                    tone={operation.operation_status}
                  />
                ))}
                {operations.length === 0 && <EmptyState label="Aucune operation enregistree." />}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream">
                  <Play className="h-5 w-5 text-primary" />
                  Sandbox runs
                </CardTitle>
                <CardDescription>Les runs sandbox declarent `side_effects = none`.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sandboxRuns.slice(0, 18).map((run) => (
                  <TimelineRow
                    key={run.id}
                    title={`${run.scenario_key} - ${run.extension_key || "extension"}`}
                    subtitle={`${run.run_status} - ${run.side_effects} - ${date(run.created_at)}`}
                    tone={run.run_status}
                  />
                ))}
                {sandboxRuns.length === 0 && <EmptyState label="Aucun sandbox run enregistre." />}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card className="border-gold/20 bg-noir/60">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold text-cream">{value}</div>
        </div>
        <div className="rounded-lg bg-primary/15 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/50 p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${danger ? "text-red-300" : "text-cream"}`}>{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, busy, disabled, onClick }: { icon: ReactNode; label: string; busy: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled || busy} className="border-gold/30">
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
}

function TimelineRow({ title, subtitle, tone }: { title: string; subtitle: string; tone: string }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir-light/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-cream">{title}</span>
        <Badge variant="outline" className={statusTone(tone)}>
          {tone}
        </Badge>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 p-6 text-center text-sm text-muted-foreground">{label}</div>;
}
