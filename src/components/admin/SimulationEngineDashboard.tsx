/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, FileClock, GitCompareArrows, Loader2, Play, RefreshCw, ShieldCheck, TrendingUp, XCircle } from "lucide-react";

type SimulationRun = {
  run_id: string;
  requested_at: string;
  completed_at: string | null;
  status: string;
  commandes_simulees: number;
  commandes_identiques: number;
  commandes_differentes: number;
  simulation_accuracy: number;
  simulation_confidence_score: number;
  margin_difference_total: number;
  commission_difference_total: number;
  commission_saved_total: number;
  commission_extra_total: number;
  profit_plateforme_simule: number;
  profit_plateforme_production: number;
  anomalies_detected: number;
  confidence_status: string;
  summary: Record<string, unknown>;
};

type SimulationComparison = {
  id: string;
  run_id: string;
  created_at: string;
  order_id: string;
  order_number: string;
  order_status: string | null;
  payment_status: string | null;
  calcul_actuel: Record<string, any>;
  calcul_p0: Record<string, any>;
  difference: Record<string, any>;
  explanation: Record<string, any>;
  differences: string[];
};

type ReadinessAction = {
  step: string;
  count: number;
  impact: string;
  done: boolean;
};

type ReadinessDashboard = {
  latest_run_id: string | null;
  simulation_confidence_score: number;
  simulation_accuracy: number;
  orders_analyzed: number;
  active_products_missing_purchase_cost: number;
  pending_payment_simulated_count: number;
  anomalies_detected: number;
  p0_readiness_components: Record<string, number>;
  p0_readiness_score: number;
  go_live_score: number;
  ready_for_production: boolean;
  confidence_explanations: Record<string, unknown>;
  production_blockers: Record<string, unknown>;
  action_plan: ReadinessAction[];
  activation_rule: string;
};

type FlightRecorderEvent = {
  id: string;
  replay_run_id: string | null;
  event_time: string;
  engine_version: string;
  business_rules_version: string;
  event_type: string;
  event_sequence: number;
  order_id: string | null;
  order_number: string | null;
  decision: string;
  final_decision: string | null;
  margin_amount: number | null;
  product_cost_total: number | null;
  commission_pool_amount: number | null;
  attribution_user_id: string | null;
  fraud_risk_level: string | null;
  block_reason: string | null;
  commission_reduction_reason: string | null;
  refusal_reason: string | null;
  explanation: Record<string, any>;
};

const formatPrice = (value: number | null | undefined) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(Number(value ?? 0)))} FCFA`;

const formatPercent = (value: number | null | undefined) =>
  `${Number(value ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

const confidenceLabel: Record<string, string> = {
  activation_complete_autorisable: "Activation complète autorisable",
  pret_activation_partielle: "Prêt activation partielle",
  pret_test_controle: "Prêt test contrôlé",
  surveillance: "Surveillance",
  insuffisant: "Insuffisant",
};

const explanationLabels: Record<string, string> = {
  produits_sans_prix_achat: "produits sans prix d'achat",
  commandes_pending: "commandes avec paiement pending",
  marge_reelle_incomplete: "marge reelle impossible a calculer",
  commission_pool_bloque: "Commission Pool bloque ou non fiable",
  marge_minimale_non_verifiable: "marge minimale non verifiable",
  anomalies_detectees: "anomalies detectees",
  activation_production_interdite: "activation Production interdite",
  simulation_confidence_sous_seuil: "Simulation Confidence sous le seuil",
  anomalies_critiques: "anomalies critiques",
};

export default function SimulationEngineDashboard() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(500);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [flightOrderRef, setFlightOrderRef] = useState("");
  const [activeReplayRunId, setActiveReplayRunId] = useState<string | null>(null);

  const { data: runs = [], isLoading: runsLoading, refetch } = useQuery({
    queryKey: ["admin-p05-simulation-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_p05_simulation_dashboard" as never)
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("P0.5 simulation dashboard unavailable", error);
        return [];
      }

      return (data ?? []) as unknown as SimulationRun[];
    },
  });

  const activeRunId = selectedRunId ?? runs[0]?.run_id ?? null;
  const latestRun = useMemo(
    () => runs.find((run) => run.run_id === activeRunId) ?? runs[0],
    [runs, activeRunId],
  );

  const { data: comparisons = [], isLoading: comparisonsLoading } = useQuery({
    queryKey: ["admin-p05-simulation-vs-production", activeRunId],
    queryFn: async () => {
      if (!activeRunId) return [];

      const { data, error } = await supabase
        .from("admin_p05_simulation_vs_production" as never)
        .select("*")
        .eq("run_id", activeRunId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.warn("P0.5 simulation comparison unavailable", error);
        return [];
      }

      return (data ?? []) as unknown as SimulationComparison[];
    },
    enabled: !!activeRunId,
  });

  const { data: readiness } = useQuery({
    queryKey: ["admin-p05-readiness-dashboard", latestRun?.run_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_p05_readiness_dashboard" as never)
        .select("*")
        .maybeSingle();

      if (error) {
        console.warn("P0.5 readiness dashboard unavailable", error);
        return null;
      }

      return data as unknown as ReadinessDashboard | null;
    },
  });

  const { data: flightEvents = [], isLoading: flightLoading } = useQuery({
    queryKey: ["admin-business-flight-recorder-events", activeReplayRunId],
    queryFn: async () => {
      const query = supabase
        .from("admin_business_flight_recorder_events" as never)
        .select("*")
        .order("event_time", { ascending: false })
        .limit(80);

      const { data, error } = activeReplayRunId
        ? await query.eq("replay_run_id", activeReplayRunId)
        : await query;

      if (error) {
        console.warn("Business Flight Recorder unavailable", error);
        return [];
      }

      return (data ?? []) as unknown as FlightRecorderEvent[];
    },
  });

  const replayMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_p05_simulation_replay" as never, {
        _limit: limit,
      } as never);

      if (error) throw error;
      return data as { run_id?: string; processed?: number; failed?: number };
    },
    onSuccess: async (data) => {
      toast({
        title: "Simulation terminée",
        description: `${data?.processed ?? 0} commande(s) rejouée(s), ${data?.failed ?? 0} erreur(s).`,
      });
      if (data?.run_id) setSelectedRunId(data.run_id);
      await queryClient.invalidateQueries({ queryKey: ["admin-p05-simulation-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-p05-simulation-vs-production"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur Simulation Engine",
        description: String((error as Error).message),
        variant: "destructive",
      });
    },
  });

  const flightReplayMutation = useMutation({
    mutationFn: async () => {
      const orderRef = flightOrderRef.trim() || comparisons[0]?.order_number;
      if (!orderRef) throw new Error("Indique un numero de commande a rejouer.");

      const { data, error } = await supabase.rpc("admin_replay_business_flight_order" as never, {
        _order_ref: orderRef,
      } as never);

      if (error) throw error;
      return data as { replay_run_id?: string; order_number?: string; event_count?: number; final_decision?: string };
    },
    onSuccess: async (data) => {
      toast({
        title: "Flight Recorder genere",
        description: `${data?.event_count ?? 0} evenement(s) pour ${data?.order_number ?? "la commande"}.`,
      });
      if (data?.replay_run_id) setActiveReplayRunId(data.replay_run_id);
      await queryClient.invalidateQueries({ queryKey: ["admin-business-flight-recorder-events"] });
    },
    onError: (error) => {
      toast({
        title: "Erreur Flight Recorder",
        description: String((error as Error).message),
        variant: "destructive",
      });
    },
  });

  const differenceRows = comparisons.filter((row) => !row.difference?.compatible);
  const confidenceScore = Number(latestRun?.simulation_confidence_score ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">P0.5 Simulation Engine</h2>
          <p className="text-sm text-muted-foreground">
            Comparaison entre le fonctionnement actuel et le moteur P0, sans mouvement financier réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={5000}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="w-28"
            aria-label="Nombre de commandes à rejouer"
          />
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={runsLoading}>
            {runsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button onClick={() => replayMutation.mutate()} disabled={replayMutation.isPending}>
            {replayMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Replay
          </Button>
        </div>
      </div>

      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            Simulation Confidence Score
          </CardTitle>
          <CardDescription>
            Le passage en production reste manuel et réservé Super Admin. Ce tableau n'active aucune commission réelle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-4xl font-bold text-cream">{formatPercent(confidenceScore)}</div>
              <Badge className="mt-2" variant={confidenceScore >= 99.5 ? "default" : "outline"}>
                {confidenceLabel[latestRun?.confidence_status ?? "insuffisant"] ?? "Insuffisant"}
              </Badge>
            </div>
            <div className="rounded-lg border border-gold/10 p-3">
              <p className="text-xs text-muted-foreground">Simulation Accuracy</p>
              <p className="text-2xl font-semibold text-primary">{formatPercent(latestRun?.simulation_accuracy)}</p>
            </div>
            <div className="rounded-lg border border-gold/10 p-3">
              <p className="text-xs text-muted-foreground">Commandes simulées</p>
              <p className="text-2xl font-semibold">{latestRun?.commandes_simulees ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gold/10 p-3">
              <p className="text-xs text-muted-foreground">Anomalies détectées</p>
              <p className="text-2xl font-semibold text-warning">{latestRun?.anomalies_detected ?? 0}</p>
            </div>
          </div>
          <ReadinessExplanations explanations={readiness?.confidence_explanations} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReadinessScoreCard readiness={readiness} />
        <ReadyForProductionCard readiness={readiness} />
        <GoLiveScoreCard readiness={readiness} />
      </div>

      <ActionPlanCard actions={readiness?.action_plan ?? []} />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Commandes identiques" value={latestRun?.commandes_identiques ?? 0} />
        <Metric title="Commandes différentes" value={latestRun?.commandes_differentes ?? 0} warning />
        <Metric title="Commission économisée" value={formatPrice(latestRun?.commission_saved_total)} />
        <Metric title="Commission supplémentaire" value={formatPrice(latestRun?.commission_extra_total)} warning />
        <Metric title="Profit plateforme simulé" value={formatPrice(latestRun?.profit_plateforme_simule)} />
        <Metric title="Profit plateforme actuel" value={formatPrice(latestRun?.profit_plateforme_production)} />
        <Metric title="Différence de marge" value={formatPrice(latestRun?.margin_difference_total)} warning={Number(latestRun?.margin_difference_total ?? 0) !== 0} />
        <Metric title="Différence commission" value={formatPrice(latestRun?.commission_difference_total)} warning={Number(latestRun?.commission_difference_total ?? 0) !== 0} />
      </div>

      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir/50">
          <TabsTrigger value="runs">
            <TrendingUp className="mr-2 h-4 w-4" />
            Runs
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <GitCompareArrows className="mr-2 h-4 w-4" />
            Simulation vs Production
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="flight-recorder">
            <FileClock className="mr-2 h-4 w-4" />
            Flight Recorder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <Card className="border-gold/20 bg-noir/50">
            <CardHeader>
              <CardTitle className="text-base text-primary">Historique des simulations</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/10 text-left text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Accuracy</th>
                    <th className="py-2 pr-3">Simulées</th>
                    <th className="py-2 pr-3">Différentes</th>
                    <th className="py-2 pr-3">Anomalies</th>
                    <th className="py-2 pr-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.run_id}
                      className="cursor-pointer border-b border-gold/5 hover:bg-gold/5"
                      onClick={() => setSelectedRunId(run.run_id)}
                    >
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{new Date(run.requested_at).toLocaleString("fr-FR")}</td>
                      <td className="py-2 pr-3 font-semibold">{formatPercent(run.simulation_confidence_score)}</td>
                      <td className="py-2 pr-3">{formatPercent(run.simulation_accuracy)}</td>
                      <td className="py-2 pr-3">{run.commandes_simulees}</td>
                      <td className="py-2 pr-3">{run.commandes_differentes}</td>
                      <td className="py-2 pr-3">{run.anomalies_detected}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={run.run_id === activeRunId ? "default" : "outline"}>
                          {confidenceLabel[run.confidence_status] ?? run.confidence_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucun replay encore. Lancez une simulation pour comparer le P0 à la production.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <ComparisonTable rows={comparisons} loading={comparisonsLoading} />
        </TabsContent>

        <TabsContent value="anomalies">
          <ComparisonTable rows={differenceRows} loading={comparisonsLoading} />
        </TabsContent>

        <TabsContent value="flight-recorder">
          <FlightRecorderPanel
            events={flightEvents}
            loading={flightLoading}
            orderRef={flightOrderRef}
            onOrderRefChange={setFlightOrderRef}
            onReplay={() => flightReplayMutation.mutate()}
            replaying={flightReplayMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReadinessExplanations({ explanations }: { explanations?: Record<string, unknown> }) {
  const entries = Object.entries(explanations ?? {}).filter(([, value]) => value !== null && value !== false && value !== undefined);

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
        Aucune raison bloquante detectee sur le dernier run.
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-gold/10 bg-black/20 p-4">
      <p className="mb-3 text-sm font-semibold text-cream">Pourquoi ?</p>
      <div className="grid gap-2 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {typeof value === "number" ? `${value} ` : ""}
              {explanationLabels[key] ?? key.replaceAll("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessScoreCard({ readiness }: { readiness?: ReadinessDashboard | null }) {
  const components = Object.entries(readiness?.p0_readiness_components ?? {});

  return (
    <Card className="border-gold/20 bg-noir/50 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base text-primary">P0 Readiness Score</CardTitle>
        <CardDescription>Lecture separee de chaque composant du moteur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold text-cream">{formatPercent(readiness?.p0_readiness_score)}</div>
        <div className="space-y-2">
          {components.map(([name, score]) => (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-semibold text-cream">{formatPercent(score)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadyForProductionCard({ readiness }: { readiness?: ReadinessDashboard | null }) {
  const blockers = Object.entries(readiness?.production_blockers ?? {}).filter(([, value]) => value !== null && value !== false && value !== undefined);
  const ready = Boolean(readiness?.ready_for_production);

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="text-base text-primary">Ready for Production ?</CardTitle>
        <CardDescription>Decision explicite avant toute activation reelle.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 text-3xl font-bold ${ready ? "text-emerald-400" : "text-red-400"}`}>
          {ready ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
          {ready ? "OUI" : "NON"}
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-cream">Blocages restants</p>
          {blockers.length > 0 ? (
            blockers.map(([key, value]) => (
              <div key={key} className="text-sm text-muted-foreground">
                - {typeof value === "number" ? `${value} ` : ""}
                {explanationLabels[key] ?? key.replaceAll("_", " ")}
              </div>
            ))
          ) : (
            <p className="text-sm text-emerald-300">Aucun blocage detecte sur le dernier run.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GoLiveScoreCard({ readiness }: { readiness?: ReadinessDashboard | null }) {
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="text-base text-primary">Go Live Score</CardTitle>
        <CardDescription>Niveau reel de preparation avant activation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold text-cream">{formatPercent(readiness?.go_live_score)}</div>
        <div className="rounded-lg border border-gold/10 p-3 text-xs text-muted-foreground">
          {readiness?.activation_rule ??
            "Activation automatique interdite. Seul un Super Admin peut autoriser une transition volontaire."}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionPlanCard({ actions }: { actions: ReadinessAction[] }) {
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="text-base text-primary">Plan d'action automatique</CardTitle>
        <CardDescription>Etapes restantes pour faire monter le niveau de confiance du P0.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {actions.map((action, index) => (
          <div key={`${action.step}-${index}`} className="rounded-lg border border-gold/10 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-cream">{index + 1}. {action.step}</p>
              {action.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />}
            </div>
            <p className="text-xs text-muted-foreground">Valeur : {typeof action.count === "number" ? formatPercent(action.count).replace(" %", "") : action.count}</p>
            <Badge className="mt-2" variant={action.impact === "Critique" ? "destructive" : "outline"}>
              Impact : {action.impact}
            </Badge>
          </div>
        ))}
        {actions.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun plan d'action disponible avant le prochain replay.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, warning = false }: { title: string; value: string | number; warning?: boolean }) {
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`mt-2 text-xl font-semibold ${warning ? "text-warning" : "text-cream"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ rows, loading }: { rows: SimulationComparison[]; loading: boolean }) {
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="text-base text-primary">Simulation vs Production</CardTitle>
        <CardDescription>Calcul actuel, calcul P0, différence et explication par commande.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/10 text-left text-muted-foreground">
              <th className="py-2 pr-3">Commande</th>
              <th className="py-2 pr-3">Paiement</th>
              <th className="py-2 pr-3">Marge actuelle</th>
              <th className="py-2 pr-3">Marge P0</th>
              <th className="py-2 pr-3">Commission actuelle</th>
              <th className="py-2 pr-3">Pool P0</th>
              <th className="py-2 pr-3">Attribution</th>
              <th className="py-2 pr-3">Décision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gold/5 align-top">
                <td className="py-2 pr-3 font-mono text-xs">{row.order_number}</td>
                <td className="py-2 pr-3">
                  <Badge variant="outline">{row.payment_status ?? "n/a"}</Badge>
                </td>
                <td className="py-2 pr-3">{formatPrice(row.calcul_actuel?.margin)}</td>
                <td className="py-2 pr-3">{formatPrice(row.calcul_p0?.contribution_margin)}</td>
                <td className="py-2 pr-3">{formatPrice(row.calcul_actuel?.commission)}</td>
                <td className="py-2 pr-3">{formatPrice(row.calcul_p0?.commission_pool)}</td>
                <td className="py-2 pr-3">
                  {row.difference?.attribution_difference ? (
                    <Badge variant="destructive">Différente</Badge>
                  ) : (
                    <Badge variant="outline">Identique</Badge>
                  )}
                </td>
                <td className="py-2 pr-3 max-w-sm">
                  <div className="space-y-1">
                    <Badge variant={row.difference?.compatible ? "default" : "secondary"}>
                      {row.difference?.compatible ? "Compatible" : "À analyser"}
                    </Badge>
                    {row.differences?.length > 0 && (
                      <p className="text-xs text-muted-foreground">{row.differences.join(", ")}</p>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  {loading ? "Chargement..." : "Aucune ligne à afficher."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function FlightRecorderPanel({
  events,
  loading,
  orderRef,
  onOrderRefChange,
  onReplay,
  replaying,
}: {
  events: FlightRecorderEvent[];
  loading: boolean;
  orderRef: string;
  onOrderRefChange: (value: string) => void;
  onReplay: () => void;
  replaying: boolean;
}) {
  const orderedEvents = [...events].sort((a, b) => a.event_sequence - b.event_sequence);

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <FileClock className="h-5 w-5" />
          LPB Business Flight Recorder
        </CardTitle>
        <CardDescription>
          Boite noire append-only du moteur financier : replay complet, explications et decision finale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={orderRef}
            onChange={(event) => onOrderRefChange(event.target.value)}
            placeholder="Numero de commande, ex: CMD-20260711-7525"
            className="max-w-md"
          />
          <Button onClick={onReplay} disabled={replaying}>
            {replaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Rejouer la commande
          </Button>
        </div>

        <div className="rounded-lg border border-gold/10 p-4">
          <p className="mb-3 text-sm font-semibold text-cream">Raisonnement reconstruit</p>
          <div className="space-y-3">
            {orderedEvents.map((event) => (
              <div key={event.id} className="grid gap-3 rounded-lg border border-gold/10 bg-black/20 p-3 md:grid-cols-[auto_1fr_auto]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {event.event_sequence}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-cream">{formatFlightEventType(event.event_type)}</p>
                    <Badge variant={event.final_decision === "approved" ? "default" : "outline"}>
                      {event.decision}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(event.explanation?.step ?? "")}
                    {event.block_reason ? ` - Blocage: ${event.block_reason}` : ""}
                    {event.refusal_reason ? ` - Refus: ${event.refusal_reason}` : ""}
                  </p>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <span>Marge: {formatPrice(event.margin_amount)}</span>
                    <span>Cout: {formatPrice(event.product_cost_total)}</span>
                    <span>Pool: {formatPrice(event.commission_pool_amount)}</span>
                    <span>Risque: {event.fraud_risk_level ?? "n/a"}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{event.order_number}</div>
                  <div>{event.engine_version}</div>
                </div>
              </div>
            ))}
            {orderedEvents.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {loading ? "Chargement..." : "Entre un numero de commande puis clique sur Rejouer la commande."}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatFlightEventType(eventType: string) {
  const labels: Record<string, string> = {
    order_created: "Commande creee",
    payment_status_checked: "Paiement verifie",
    product_cost_loaded: "Cout produit recupere",
    margin_calculated: "Marge calculee",
    commission_pool_calculated: "Commission Pool calcule",
    attribution_determined: "Attribution determinee",
    fraud_checked: "Fraude verifiee",
    ai_governance_decision: "Decision AI Governance",
  };

  return labels[eventType] ?? eventType.replaceAll("_", " ");
}
