import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Gauge, MousePointerClick, Layers, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { metric: string; value: number; route: string; rating: string | null; created_at: string };

type Agg = {
  metric: string;
  route: string;
  samples: number;
  p75: number;
  good: number;
  poor: number;
};

const VITAL_META: Record<string, { label: string; unit: string; icon: typeof Gauge; goodMax: number; poorMin: number }> = {
  LCP: { label: "Largest Contentful Paint", unit: "ms", icon: Gauge, goodMax: 2500, poorMin: 4000 },
  INP: { label: "Interaction to Next Paint", unit: "ms", icon: MousePointerClick, goodMax: 200, poorMin: 500 },
  CLS: { label: "Cumulative Layout Shift", unit: "", icon: Layers, goodMax: 0.1, poorMin: 0.25 },
  FCP: { label: "First Contentful Paint", unit: "ms", icon: Gauge, goodMax: 1800, poorMin: 3000 },
  TTFB: { label: "Time to First Byte", unit: "ms", icon: Activity, goodMax: 800, poorMin: 1800 },
};

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function format(metric: string, value: number) {
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function ratingBadge(metric: string, value: number) {
  const meta = VITAL_META[metric];
  if (!meta) return null;
  if (value <= meta.goodMax) return <Badge className="bg-success/20 text-success border-success/30">Bon</Badge>;
  if (value >= meta.poorMin) return <Badge variant="destructive">Lent</Badge>;
  return <Badge className="bg-warning/20 text-warning-foreground border-warning/30">À améliorer</Badge>;
}

export const InfrastructureMonitoring = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<24 | 168>(24);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("perf_metrics")
      .select("metric,value,route,rating,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  // Global aggregates per metric
  const globalByMetric = Object.keys(VITAL_META).map((m) => {
    const values = rows.filter((r) => r.metric === m).map((r) => r.value);
    return {
      metric: m,
      samples: values.length,
      p75: percentile(values, 75),
    };
  });

  // Per-route aggregates (top 10 by samples) for LCP & INP
  const routeAgg: Agg[] = [];
  for (const metric of ["LCP", "INP", "CLS"]) {
    const byRoute = new Map<string, number[]>();
    rows.filter((r) => r.metric === metric).forEach((r) => {
      if (!byRoute.has(r.route)) byRoute.set(r.route, []);
      byRoute.get(r.route)!.push(r.value);
    });
    for (const [route, values] of byRoute.entries()) {
      const meta = VITAL_META[metric];
      routeAgg.push({
        metric,
        route,
        samples: values.length,
        p75: percentile(values, 75),
        good: values.filter((v) => v <= meta.goodMax).length,
        poor: values.filter((v) => v >= meta.poorMin).length,
      });
    }
  }
  const topRoutes = routeAgg.sort((a, b) => b.samples - a.samples).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display text-primary">Performance & Infrastructure</h2>
          <p className="text-sm text-muted-foreground">
            Indicateurs Web Vitals collectés en temps réel auprès des visiteurs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={hours === 24 ? "default" : "outline"}
            onClick={() => setHours(24)}
          >
            24 h
          </Button>
          <Button
            size="sm"
            variant={hours === 168 ? "default" : "outline"}
            onClick={() => setHours(168)}
          >
            7 j
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Vital cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {globalByMetric.map(({ metric, samples, p75 }) => {
          const meta = VITAL_META[metric];
          const Icon = meta.icon;
          return (
            <Card key={metric} className="bg-noir/50 border-gold/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {metric}
                  </CardTitle>
                  {samples > 0 && ratingBadge(metric, p75)}
                </div>
                <CardDescription className="text-xs">{meta.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display text-primary">
                  {samples === 0 ? "—" : format(metric, p75)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  p75 · {samples} mesure{samples > 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-route table */}
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-primary">Performance par route</CardTitle>
          <CardDescription>
            p75 par page · top 20 routes les plus visitées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {loading ? "Chargement…" : "Aucune mesure pour cette période. Les indicateurs se collectent automatiquement à chaque visite."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/10 text-left text-muted-foreground">
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Métrique</th>
                    <th className="py-2 pr-4">p75</th>
                    <th className="py-2 pr-4">Mesures</th>
                    <th className="py-2 pr-4">% lent</th>
                    <th className="py-2 pr-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {topRoutes.map((r, i) => (
                    <tr key={i} className="border-b border-gold/5">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground/80">{r.route}</td>
                      <td className="py-2 pr-4">{r.metric}</td>
                      <td className="py-2 pr-4 font-medium">{format(r.metric, r.p75)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.samples}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.samples === 0 ? "—" : `${Math.round((r.poor / r.samples) * 100)}%`}
                      </td>
                      <td className="py-2 pr-4">{ratingBadge(r.metric, r.p75)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-primary text-base">Bonnes pratiques recommandées</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Utilisez <code className="text-primary">&lt;LazyImage&gt;</code> pour toutes les images hors écran (chargement différé natif).</p>
          <p>• Marquez l'image héro avec <code className="text-primary">priority</code> pour réserver la priorité réseau.</p>
          <p>• LCP cible &lt; 2,5 s · INP cible &lt; 200 ms · CLS cible &lt; 0,1.</p>
          <p>• Les mesures de plus de 30 jours sont purgées automatiquement.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InfrastructureMonitoring;