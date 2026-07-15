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
import { AlertTriangle, GitCompareArrows, Loader2, Play, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";

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

export default function SimulationEngineDashboard() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(500);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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
        </CardContent>
      </Card>

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
      </Tabs>
    </div>
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
