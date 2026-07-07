import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Loader2, Shield, Award, TrendingUp, TrendingDown } from "lucide-react";

type SubjectType = "customer" | "vendor" | "ambassador" | "wholesaler";

type TrustScore = {
  id: string;
  subject_id: string;
  subject_type: SubjectType;
  score: number;
  tier: string;
  positive_count: number;
  negative_count: number;
  breakdown: Record<string, number>;
  computed_at: string;
};

type TrustSignal = {
  id: number;
  subject_id: string;
  subject_type: SubjectType;
  signal_type: string;
  weight: number;
  polarity: number;
  source: string | null;
  occurred_at: string;
};

const TIER_COLORS: Record<string, string> = {
  diamond: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  platinum: "bg-slate-300/20 text-slate-200 border-slate-300/40",
  gold: "bg-primary/20 text-primary border-primary/40",
  silver: "bg-muted text-muted-foreground border-border",
  bronze: "bg-orange-500/20 text-orange-300 border-orange-500/40",
};

function TierBadge({ tier }: { tier: string }) {
  return <Badge className={TIER_COLORS[tier] ?? TIER_COLORS.bronze}>{tier}</Badge>;
}

export const ReputationDashboard = () => {
  const { t, i18n } = useTranslation();
  const [scores, setScores] = useState<TrustScore[]>([]);
  const [signals, setSignals] = useState<TrustSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [filter, setFilter] = useState<SubjectType | "all">("all");

  const load = async () => {
    setLoading(true);
    const [sRes, gRes] = await Promise.all([
      supabase.from("trust_scores").select("*").order("score", { ascending: false }).limit(200),
      supabase.from("trust_signals").select("*").order("id", { ascending: false }).limit(100),
    ]);
    if (sRes.data) setScores(sRes.data as TrustScore[]);
    if (gRes.data) setSignals(gRes.data as TrustSignal[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.rpc("recompute_all_trust_scores");
      if (error) throw error;
      toast({ title: t("reputationDashboard.toastRecomputeDone"), description: t("reputationDashboard.toastRecomputeDesc", { count: data ?? 0 }) });
      await load();
    } catch (e) {
      toast({ title: t("reputationDashboard.toastError"), description: String((e as Error).message), variant: "destructive" });
    } finally {
      setRecomputing(false);
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? scores : scores.filter((s) => s.subject_type === filter)),
    [scores, filter]
  );

  const kpis = useMemo(() => {
    const arr = filtered;
    const avg = arr.length ? arr.reduce((s, x) => s + Number(x.score), 0) / arr.length : 0;
    const byTier: Record<string, number> = {};
    arr.forEach((x) => { byTier[x.tier] = (byTier[x.tier] ?? 0) + 1; });
    return { total: arr.length, avg, byTier };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display text-primary">{t("reputationDashboard.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("reputationDashboard.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={recompute} disabled={recomputing}>
            {recomputing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            {t("reputationDashboard.recomputeAll")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>{t("reputationDashboard.kpiSubjects")}</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{kpis.total}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>{t("reputationDashboard.kpiAvgScore")}</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{kpis.avg.toFixed(1)}</div></CardContent>
        </Card>
        {["diamond", "platinum", "gold"].map((t) => (
          <Card key={t} className="bg-noir/50 border-gold/20">
            <CardHeader className="pb-2"><CardDescription className="capitalize">{t}</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-display text-primary">{kpis.byTier[t] ?? 0}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "customer", "vendor", "ambassador", "wholesaler"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? t("reputationDashboard.filterAll") : f}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="scores">
        <TabsList className="bg-noir/50 border border-gold/20">
          <TabsTrigger value="scores"><Award className="h-4 w-4 mr-2" />{t("reputationDashboard.tabRanking")}</TabsTrigger>
          <TabsTrigger value="signals"><TrendingUp className="h-4 w-4 mr-2" />{t("reputationDashboard.tabSignals")}</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader><CardTitle className="text-primary text-base">{t("reputationDashboard.topScores")}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-gold/10">
                    <th className="py-2 pr-3">{t("reputationDashboard.colSubject")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colType")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colScore")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colTier")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colPosNeg")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colRecomputed")}</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0 && !loading && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{t("reputationDashboard.noScores")}</td></tr>
                    )}
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-gold/5">
                        <td className="py-2 pr-3 font-mono text-xs truncate max-w-[180px]">{s.subject_id}</td>
                        <td className="py-2 pr-3 capitalize">{s.subject_type}</td>
                        <td className="py-2 pr-3 text-primary font-medium">{Number(s.score).toFixed(1)}</td>
                        <td className="py-2 pr-3"><TierBadge tier={s.tier} /></td>
                        <td className="py-2 pr-3 text-xs"><span className="text-success">{s.positive_count}</span> / <span className="text-destructive">{s.negative_count}</span></td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{new Date(s.computed_at).toLocaleString(i18n.language === "en" ? "en-US" : "fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader><CardTitle className="text-primary text-base">{t("reputationDashboard.signalsLog")}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-gold/10">
                    <th className="py-2 pr-3">{t("reputationDashboard.colWhen")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colType")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colSubject")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colSignal")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colWeight")}</th>
                    <th className="py-2 pr-3">{t("reputationDashboard.colSource")}</th>
                  </tr></thead>
                  <tbody>
                    {signals.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">{t("reputationDashboard.noSignals")}</td></tr>}
                    {signals.map((sig) => (
                      <tr key={sig.id} className="border-b border-gold/5">
                        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(sig.occurred_at).toLocaleString(i18n.language === "en" ? "en-US" : "fr-FR")}</td>
                        <td className="py-2 pr-3 capitalize">{sig.subject_type}</td>
                        <td className="py-2 pr-3 font-mono text-xs truncate max-w-[140px]">{sig.subject_id}</td>
                        <td className="py-2 pr-3">{sig.signal_type}</td>
                        <td className="py-2 pr-3">
                          {sig.polarity > 0
                            ? <span className="inline-flex items-center gap-1 text-success"><TrendingUp className="h-3 w-3" />+{sig.weight}</span>
                            : <span className="inline-flex items-center gap-1 text-destructive"><TrendingDown className="h-3 w-3" />−{sig.weight}</span>}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{sig.source ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReputationDashboard;