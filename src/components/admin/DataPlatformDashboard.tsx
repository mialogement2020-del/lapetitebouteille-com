import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Loader2, Database, TrendingUp, Users, Activity } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsRow = {
  id: number;
  event_name: string;
  category: string;
  user_id: string | null;
  session_id: string | null;
  path: string | null;
  device: string | null;
  revenue: number | null;
  occurred_at: string;
  properties: Record<string, unknown>;
};

type Range = "24h" | "7d" | "30d";

const RANGES: Record<Range, number> = { "24h": 1, "7d": 7, "30d": 30 };

export const DataPlatformDashboard = () => {
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("7d");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGES[range] * 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("analytics_events")
      .select("*")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(5000);
    setRows((data ?? []) as AnalyticsRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const sessions = new Set(rows.map((r) => r.session_id).filter(Boolean));
    const users = new Set(rows.map((r) => r.user_id).filter(Boolean));
    const pageViews = rows.filter((r) => r.event_name === "page_view").length;
    const revenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    return { events: rows.length, sessions: sessions.size, users: users.size, pageViews, revenue };
  }, [rows]);

  const daily = useMemo(() => {
    const buckets: Record<string, { day: string; events: number; sessions: Set<string> }> = {};
    rows.forEach((r) => {
      const day = new Date(r.occurred_at).toISOString().slice(0, 10);
      if (!buckets[day]) buckets[day] = { day, events: 0, sessions: new Set() };
      buckets[day].events += 1;
      if (r.session_id) buckets[day].sessions.add(r.session_id);
    });
    return Object.values(buckets)
      .map((b) => ({ day: b.day.slice(5), events: b.events, sessions: b.sessions.size }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [rows]);

  const topEvents = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      map[r.event_name] = (map[r.event_name] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  const topPaths = useMemo(() => {
    const map: Record<string, number> = {};
    rows.filter((r) => r.event_name === "page_view").forEach((r) => {
      const p = r.path ?? "/";
      map[p] = (map[p] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const deviceSplit = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const d = r.device ?? "unknown";
      map[d] = (map[d] ?? 0) + 1;
    });
    return map;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display text-primary">Data Platform</h2>
          <p className="text-sm text-muted-foreground">
            Tracking unifié · entrepôt analytique · KPI temps réel
          </p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Database className="h-3 w-3" />Événements</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{stats.events.toLocaleString("fr-FR")}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Activity className="h-3 w-3" />Sessions</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{stats.sessions.toLocaleString("fr-FR")}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Users className="h-3 w-3" />Utilisateurs</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{stats.users.toLocaleString("fr-FR")}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>Pages vues</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{stats.pageViews.toLocaleString("fr-FR")}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />Revenu tracké</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{stats.revenue.toLocaleString("fr-FR")}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader><CardTitle className="text-primary text-base">Activité quotidienne</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-gold/20">
          <CardHeader><CardTitle className="text-primary text-base">Top événements</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topEvents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader><CardTitle className="text-primary text-base">Pages les plus visitées</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPaths.map((p) => (
                <div key={p.path} className="flex items-center justify-between text-sm border-b border-gold/5 py-1">
                  <span className="font-mono text-xs truncate max-w-[70%] text-muted-foreground">{p.path}</span>
                  <Badge variant="outline">{p.count}</Badge>
                </div>
              ))}
              {topPaths.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-gold/20">
          <CardHeader><CardTitle className="text-primary text-base">Répartition device</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(deviceSplit).map(([device, count]) => {
              const pct = stats.events ? Math.round((count / stats.events) * 100) : 0;
              return (
                <div key={device}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{device}</span>
                    <span className="text-muted-foreground">{count.toLocaleString("fr-FR")} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-noir/60 rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(deviceSplit).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataPlatformDashboard;