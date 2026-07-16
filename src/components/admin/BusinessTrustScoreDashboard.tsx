import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";

const db = supabase as any;

type ScoreDashboard = {
  user_id: string;
  profile_type: string | null;
  display_name: string | null;
  business_score: number;
  trust_score: number;
  global_score: number;
  score_level: string;
  strengths: string[];
  improvement_areas: string[];
  recommendations: Array<Record<string, unknown>>;
  metrics: Record<string, number | string | boolean | null>;
  scoring_version: string;
  rule_version: string;
  calculated_at: string;
};

type ScoreBadge = {
  slug: string;
  title: string;
  description: string | null;
  badge_type: string;
  status: string;
  reason: string | null;
  earned_at: string;
};

type ScoreRecommendation = {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  profile_type: string | null;
  business_score: number;
  trust_score: number;
  global_score: number;
  score_level: string;
  strengths: string[];
  improvement_areas: string[];
  calculated_at: string;
};

type AlertRow = LeaderboardRow & {
  alert_type: string;
};

const levelLabels: Record<string, string> = {
  starter: "Starter",
  progressing: "En progression",
  confirmed: "Confirme",
  elite: "Elite",
};

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-gold/10 text-primary border-gold/30",
  low: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const formatScore = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const labelize = (value: string) => value.replace(/_/g, " ");

function ScoreCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: typeof TrendingUp;
  description: string;
}) {
  return (
    <Card className="border-gold/20 bg-noir/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-4xl font-bold text-cream">{formatScore(value)}</div>
        <Progress value={Math.min(100, Number(value || 0))} className="h-2" />
      </CardContent>
    </Card>
  );
}

export default function BusinessTrustScoreDashboard() {
  const [dashboard, setDashboard] = useState<ScoreDashboard | null>(null);
  const [badges, setBadges] = useState<ScoreBadge[]>([]);
  const [recommendations, setRecommendations] = useState<ScoreRecommendation[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  const metrics = useMemo(() => dashboard?.metrics || {}, [dashboard]);

  const loadData = async () => {
    setIsLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    const [dashboardResult, badgesResult, recommendationsResult, leaderboardResult, alertsResult] = await Promise.all([
      db.from("my_business_trust_score_dashboard").select("*").eq("user_id", currentUserId).maybeSingle(),
      db.from("my_business_score_badges").select("*").eq("user_id", currentUserId),
      db.from("my_business_score_recommendations").select("*").eq("user_id", currentUserId).limit(20),
      db.from("admin_business_score_leaderboard").select("*").order("global_score", { ascending: false }).limit(50),
      db.from("admin_business_score_alerts").select("*").limit(50),
    ]);

    if (!dashboardResult.error) setDashboard(dashboardResult.data || null);
    if (!badgesResult.error) setBadges(badgesResult.data || []);
    if (!recommendationsResult.error) setRecommendations(recommendationsResult.data || []);
    if (!leaderboardResult.error) setLeaderboard(leaderboardResult.data || []);
    if (!alertsResult.error) setAlerts(alertsResult.data || []);

    if (dashboardResult.error) {
      toast({ title: "Score non disponible", description: dashboardResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const calculateScore = async (userId?: string) => {
    setIsCalculating(true);
    const { error } = await db.rpc("calculate_business_trust_score", {
      _user_id: userId || undefined,
    });
    setIsCalculating(false);

    if (error) {
      toast({ title: "Calcul impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Score calcule", description: "Un nouveau snapshot analytique a ete cree." });
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Business Score...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">Business Score & Trust Score</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Moteur d'analyse de qualite, fiabilite, engagement et performance. Aucun impact financier ni P0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => calculateScore()} disabled={isCalculating}>
            {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Calculer mon score
          </Button>
        </div>
      </div>

      {dashboard ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ScoreCard title="Business Score" value={dashboard.business_score} icon={TrendingUp} description="Activite, CRM, IA, formations et performance." />
            <ScoreCard title="Trust Score" value={dashboard.trust_score} icon={ShieldCheck} description="Fiabilite, conformite, annulations et signaux risque." />
            <ScoreCard title="Score global" value={dashboard.global_score} icon={Target} description="Synthese analytique non financiere." />
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Niveau
                </CardTitle>
                <CardDescription>{dashboard.profile_type || "profil LPB"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cream">{levelLabels[dashboard.score_level] || dashboard.score_level}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Version {dashboard.scoring_version} - regles {dashboard.rule_version}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Points forts</CardTitle>
                <CardDescription>Ce que le moteur detecte comme solide.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(dashboard.strengths || []).length ? dashboard.strengths.map((item) => (
                  <Badge key={item} className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {labelize(item)}
                  </Badge>
                )) : <p className="text-sm text-muted-foreground">Calculez plus de signaux pour faire apparaitre les points forts.</p>}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Axes d'amelioration</CardTitle>
                <CardDescription>Priorites d'accompagnement proposees.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(dashboard.improvement_areas || []).length ? dashboard.improvement_areas.map((item) => (
                  <Badge key={item} className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {labelize(item)}
                  </Badge>
                )) : <p className="text-sm text-muted-foreground">Aucun axe critique detecte.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-gold/20 bg-noir/60">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-muted-foreground">Aucun snapshot de score pour le moment.</p>
            <Button onClick={() => calculateScore()} disabled={isCalculating}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generer le premier score
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="border border-gold/20 bg-noir/70">
          <TabsTrigger value="recommendations">Recommandations IA</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="metrics">Signaux</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="grid gap-4 lg:grid-cols-2">
          {recommendations.length ? recommendations.map((item) => (
            <Card key={item.id} className="border-gold/20 bg-noir/60">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-cream">
                      <Brain className="h-5 w-5 text-primary" />
                      {item.title}
                    </CardTitle>
                    <CardDescription>{item.recommendation_type}</CardDescription>
                  </div>
                  <Badge className={priorityTone[item.priority] || priorityTone.medium}>{item.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.description}</CardContent>
            </Card>
          )) : (
            <Card className="border-gold/20 bg-noir/60 lg:col-span-2">
              <CardContent className="p-6 text-muted-foreground">Aucune recommandation ouverte.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="badges" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {badges.length ? badges.map((badge) => (
            <Card key={badge.slug} className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cream">
                  <Award className="h-5 w-5 text-primary" />
                  {badge.title}
                </CardTitle>
                <CardDescription>{badge.badge_type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{badge.description}</p>
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{badge.status}</Badge>
              </CardContent>
            </Card>
          )) : (
            <Card className="border-gold/20 bg-noir/60 md:col-span-2 xl:col-span-3">
              <CardContent className="p-6 text-muted-foreground">Aucun badge obtenu pour l'instant.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <BarChart3 className="h-5 w-5 text-primary" />
                Signaux utilises
              </CardTitle>
              <CardDescription>Lecture analytique des signaux, sans consequence financiere.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-gold/10 bg-black/20 p-3">
                  <p className="text-xs text-muted-foreground">{labelize(key)}</p>
                  <p className="mt-1 text-lg font-semibold text-cream">{String(value ?? 0)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Recalcul admin</CardTitle>
              <CardDescription>Recalcule un score pour un utilisateur precis. Cela cree seulement un snapshot analytique.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              <Input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="UUID utilisateur" />
              <Button onClick={() => calculateScore(targetUserId)} disabled={!targetUserId || isCalculating}>
                <Sparkles className="mr-2 h-4 w-4" />
                Recalculer
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Classement global</CardTitle>
                <CardDescription>Dernier snapshot par utilisateur.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-gold/10">
                      <th className="py-3">Utilisateur</th>
                      <th>Profil</th>
                      <th>Business</th>
                      <th>Trust</th>
                      <th>Global</th>
                      <th>Niveau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr key={row.user_id} className="border-b border-gold/5">
                        <td className="py-3 text-cream">{row.display_name || row.user_id.slice(0, 8)}</td>
                        <td>{row.profile_type}</td>
                        <td>{formatScore(row.business_score)}</td>
                        <td>{formatScore(row.trust_score)}</td>
                        <td className="font-semibold text-primary">{formatScore(row.global_score)}</td>
                        <td>{levelLabels[row.score_level] || row.score_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Alertes accompagnement</CardTitle>
                <CardDescription>Utilisateurs a suivre ou a aider.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length ? alerts.map((alert) => (
                  <div key={alert.user_id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-cream">{alert.display_name || alert.user_id.slice(0, 8)}</p>
                      <Badge className="bg-red-500/15 text-red-300 border-red-500/30">{labelize(alert.alert_type)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Global {formatScore(alert.global_score)} - Trust {formatScore(alert.trust_score)}
                    </p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Aucune alerte active.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
