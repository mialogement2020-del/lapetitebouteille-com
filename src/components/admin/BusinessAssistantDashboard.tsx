import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Bot,
  Brain,
  CalendarClock,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";

const db = supabase as any;

type AssistantDashboard = {
  id: string;
  user_id: string;
  period: string;
  summary_title: string;
  summary_text: string;
  data_used: Record<string, unknown>;
  rules_applied: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  next_best_actions: Array<Record<string, unknown>>;
  recommended_products: Array<Record<string, unknown>>;
  recommended_campaigns: Array<Record<string, unknown>>;
  recommended_courses: Array<Record<string, unknown>>;
  assistant_version: string;
  created_at: string;
};

type AssistantRecommendation = {
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  explanation: Record<string, unknown>;
  expected_impact: Record<string, unknown>;
  created_at: string;
};

type AssistantAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  explanation: Record<string, unknown>;
  status: string;
  created_at: string;
};

type AssistantQuestion = {
  id: string;
  question: string;
  answer: string;
  intent: string;
  confidence: number;
  data_used: Record<string, unknown>;
  rules_applied: Record<string, unknown>;
  recommended_actions: Array<Record<string, unknown>>;
  created_at: string;
};

type AssistantSummary = {
  id: string;
  summary_type: string;
  period_start: string;
  period_end: string;
  title: string;
  content: string;
  created_at: string;
};

type AdminOverview = {
  user_id: string;
  last_snapshot_at: string | null;
  snapshots_total: number;
  open_recommendations: number;
  open_alerts: number;
  high_alerts: number;
  questions_total: number;
};

const priorityTone: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/15 text-red-300",
  high: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  medium: "border-gold/30 bg-gold/10 text-primary",
  low: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  info: "border-blue-500/30 bg-blue-500/15 text-blue-300",
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Jamais";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const labelize = (value: string) => value.replace(/_/g, " ");

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Sparkles;
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
      <CardContent>
        <div className="text-3xl font-bold text-cream">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function BusinessAssistantDashboard() {
  const [dashboard, setDashboard] = useState<AssistantDashboard | null>(null);
  const [recommendations, setRecommendations] = useState<AssistantRecommendation[]>([]);
  const [alerts, setAlerts] = useState<AssistantAlert[]>([]);
  const [questions, setQuestions] = useState<AssistantQuestion[]>([]);
  const [summaries, setSummaries] = useState<AssistantSummary[]>([]);
  const [overview, setOverview] = useState<AdminOverview[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [asking, setAsking] = useState(false);

  const dataUsed = useMemo(() => dashboard?.data_used || {}, [dashboard]);
  const nextActions = useMemo(() => asArray<Record<string, unknown>>(dashboard?.next_best_actions), [dashboard]);

  const load = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;

    const [dashboardRes, recommendationsRes, alertsRes, questionsRes, summariesRes, overviewRes] = await Promise.all([
      db.from("my_business_assistant_dashboard").select("*").eq("user_id", currentUserId).maybeSingle(),
      db.from("my_business_assistant_recommendations").select("*").eq("user_id", currentUserId).limit(80),
      db.from("my_business_assistant_alerts").select("*").eq("user_id", currentUserId).limit(80),
      db.from("my_business_assistant_qa_history").select("*").eq("user_id", currentUserId).limit(30),
      db.from("my_business_assistant_summaries").select("*").eq("user_id", currentUserId).limit(30),
      db.from("admin_business_assistant_overview").select("*").limit(100),
    ]);

    if (dashboardRes.error) {
      setDashboard(null);
    } else if (dashboardRes.data) {
      setDashboard({
        ...dashboardRes.data,
        strengths: asArray<string>(dashboardRes.data.strengths),
        weaknesses: asArray<string>(dashboardRes.data.weaknesses),
        next_best_actions: asArray<Record<string, unknown>>(dashboardRes.data.next_best_actions),
        recommended_products: asArray<Record<string, unknown>>(dashboardRes.data.recommended_products),
        recommended_campaigns: asArray<Record<string, unknown>>(dashboardRes.data.recommended_campaigns),
        recommended_courses: asArray<Record<string, unknown>>(dashboardRes.data.recommended_courses),
      });
    }

    if (!recommendationsRes.error) setRecommendations((recommendationsRes.data || []) as AssistantRecommendation[]);
    if (!alertsRes.error) setAlerts((alertsRes.data || []) as AssistantAlert[]);
    if (!questionsRes.error) setQuestions((questionsRes.data || []) as AssistantQuestion[]);
    if (!summariesRes.error) setSummaries((summariesRes.data || []) as AssistantSummary[]);
    if (!overviewRes.error) setOverview((overviewRes.data || []) as AdminOverview[]);

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const generateSnapshot = async (period = "daily") => {
    setGenerating(true);
    const { error } = await db.rpc("generate_business_assistant_snapshot", { _period: period });
    setGenerating(false);

    if (error) {
      toast({ title: "Assistant indisponible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Resume genere", description: "Le Business Assistant a mis a jour les recommandations." });
    await load();
  };

  const generateSummary = async (summaryType: string) => {
    setGenerating(true);
    const { error } = await db.rpc("generate_business_assistant_summary", { _summary_type: summaryType });
    setGenerating(false);

    if (error) {
      toast({ title: "Resume impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Bilan genere", description: "Le resume a ete sauvegarde sans impact financier." });
    await load();
  };

  const askAssistant = async () => {
    if (!question.trim()) {
      toast({ title: "Question manquante", description: "Ecrivez une question pour le Business Assistant.", variant: "destructive" });
      return;
    }

    setAsking(true);
    const { error } = await db.rpc("ask_business_assistant", { _question: question.trim() });
    setAsking(false);

    if (error) {
      toast({ title: "Reponse impossible", description: error.message, variant: "destructive" });
      return;
    }

    setQuestion("");
    toast({ title: "Reponse generee", description: "La reponse est explicable et conservee en historique." });
    await load();
  };

  if (loading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du Business Assistant...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">LPB Business Assistant IA</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Assistant commercial explicable qui orchestre CRM, calendrier, objectifs, coach, supports, Academy et scores. Aucun impact P0.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => generateSnapshot("daily")} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generer aujourd'hui
          </Button>
        </div>
      </div>

      {dashboard ? (
        <>
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Brain className="h-5 w-5 text-primary" />
                {dashboard.summary_title}
              </CardTitle>
              <CardDescription>
                Version {dashboard.assistant_version} - {formatDate(dashboard.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-lg text-cream">{dashboard.summary_text}</p>
              <div className="grid gap-3 md:grid-cols-4">
                <MetricCard title="Relances dues" value={String(dataUsed.crm_tasks_due || 0)} description="CRM Conseiller" icon={Target} />
                <MetricCard title="Objectifs en retard" value={String(dataUsed.overdue_goals || 0)} description="Objectifs IA" icon={AlertTriangle} />
                <MetricCard title="Opportunites" value={String(dataUsed.active_commercial_opportunities || 0)} description="Calendrier IA" icon={CalendarClock} />
                <MetricCard title="Score global" value={String(dataUsed.global_score || 0)} description="Business & Trust" icon={CheckCircle2} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-cream">Forces</h3>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.strengths.length ? dashboard.strengths.map((item) => (
                      <Badge key={item} className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                        {labelize(item)}
                      </Badge>
                    )) : <span className="text-sm text-muted-foreground">Aucune force majeure detectee.</span>}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-cream">Axes d'amelioration</h3>
                  <div className="flex flex-wrap gap-2">
                    {dashboard.weaknesses.length ? dashboard.weaknesses.map((item) => (
                      <Badge key={item} className="border-orange-500/30 bg-orange-500/15 text-orange-300">
                        {labelize(item)}
                      </Badge>
                    )) : <span className="text-sm text-muted-foreground">Aucun blocage prioritaire.</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-gold/20 bg-noir/60">
          <CardHeader>
            <CardTitle className="text-cream">Aucun snapshot Business Assistant</CardTitle>
            <CardDescription>Generez le premier resume pour initialiser le tableau de bord.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => generateSnapshot("daily")} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Initialiser l'assistant
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir/60">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="qa">Question/Reponse</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="content">Produits & campagnes</TabsTrigger>
          <TabsTrigger value="summaries">Bilans</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {nextActions.length ? nextActions.map((action, index) => (
              <Card key={`${action.title}-${index}`} className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cream">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {String(action.title || "Action conseillee")}
                  </CardTitle>
                  <CardDescription>{labelize(String(action.reason || "signal P1"))}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className={priorityTone[String(action.priority || "medium")] || priorityTone.medium}>
                    {String(action.priority || "medium")}
                  </Badge>
                </CardContent>
              </Card>
            )) : (
              <Card className="border-gold/20 bg-noir/60">
                <CardContent className="p-6 text-muted-foreground">Aucune action prioritaire. Generez un snapshot pour recalculer.</CardContent>
              </Card>
            )}
          </div>

          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Recommandations sauvegardees</CardTitle>
              <CardDescription>Chaque recommandation garde ses donnees et regles explicatives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length ? recommendations.map((item) => (
                <div key={item.id} className="rounded-lg border border-gold/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-cream">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge className={priorityTone[item.priority] || priorityTone.medium}>{item.priority}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Impact financier: aucun. P0 non consulte.</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune recommandation sauvegardee.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa" className="space-y-4">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <HelpCircle className="h-5 w-5 text-primary" />
                Poser une question
              </CardTitle>
              <CardDescription>L'assistant repond avec les donnees utilisees et les regles appliquees.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ex: Que dois-je faire aujourd'hui ? Pourquoi mon Business Score baisse ? Quel client relancer ?"
                className="min-h-[120px] border-gold/20 bg-noir/80"
              />
              <Button onClick={askAssistant} disabled={asking}>
                {asking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Demander a l'assistant
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {questions.length ? questions.map((item) => (
              <Card key={item.id} className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="text-base text-cream">{item.question}</CardTitle>
                  <CardDescription>{labelize(item.intent)} - confiance {item.confidence}% - {formatDate(item.created_at)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-cream">{item.answer}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Donnees: P1 uniquement. Regle: conseil explicable, aucun impact financier.</p>
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground">Aucune question posee.</p>}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {alerts.length ? alerts.map((item) => (
            <Card key={item.id} className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-cream">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    {item.title}
                  </span>
                  <Badge className={priorityTone[item.severity] || priorityTone.medium}>{item.severity}</Badge>
                </CardTitle>
                <CardDescription>{labelize(item.alert_type)} - {formatDate(item.created_at)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground">Aucune alerte active.</p>}
        </TabsContent>

        <TabsContent value="content" className="grid gap-4 lg:grid-cols-3">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Produits recommandes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard?.recommended_products?.length ? dashboard.recommended_products.map((product) => (
                <div key={String(product.product_id)} className="rounded-lg border border-gold/10 p-3">
                  <p className="font-semibold text-cream">{String(product.name || "Produit")}</p>
                  <p className="text-xs text-muted-foreground">{String(product.price || 0)} FCFA - stock {String(product.stock_quantity || 0)}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucun produit recommande.</p>}
            </CardContent>
          </Card>

          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Campagnes actives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard?.recommended_campaigns?.length ? dashboard.recommended_campaigns.map((campaign) => (
                <div key={String(campaign.id)} className="rounded-lg border border-gold/10 p-3">
                  <p className="font-semibold text-cream">{String(campaign.name || "Campagne")}</p>
                  <p className="text-xs text-muted-foreground">{labelize(String(campaign.priority || "medium"))}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune campagne recommandee.</p>}
            </CardContent>
          </Card>

          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">Cours Academy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard?.recommended_courses?.length ? dashboard.recommended_courses.map((course) => (
                <div key={String(course.course_id)} className="rounded-lg border border-gold/10 p-3">
                  <p className="font-semibold text-cream">{String(course.title || "Cours")}</p>
                  <p className="text-xs text-muted-foreground">{labelize(String(course.level || "formation"))}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucun cours recommande.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => generateSummary("daily")} disabled={generating}>Resume quotidien</Button>
            <Button variant="outline" onClick={() => generateSummary("weekly")} disabled={generating}>Resume hebdo</Button>
            <Button variant="outline" onClick={() => generateSummary("monthly")} disabled={generating}>Resume mensuel</Button>
            <Button variant="outline" onClick={() => generateSummary("personal_review")} disabled={generating}>Bilan personnel</Button>
          </div>
          {summaries.length ? summaries.map((item) => (
            <Card key={item.id} className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">{item.title}</CardTitle>
                <CardDescription>{item.period_start} - {item.period_end}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.content}</p>
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground">Aucun bilan sauvegarde.</p>}
        </TabsContent>

        <TabsContent value="admin" className="space-y-3">
          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Bot className="h-5 w-5 text-primary" />
                Vue globale admin
              </CardTitle>
              <CardDescription>Activite Business Assistant par utilisateur, sans flux financier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.length ? overview.map((row) => (
                <div key={row.user_id} className="grid gap-2 rounded-lg border border-gold/10 p-3 text-sm md:grid-cols-6">
                  <span className="truncate text-cream">{row.user_id}</span>
                  <span>Snapshots: {row.snapshots_total}</span>
                  <span>Reco: {row.open_recommendations}</span>
                  <span>Alertes: {row.open_alerts}</span>
                  <span>Hautes: {row.high_alerts}</span>
                  <span>Questions: {row.questions_total}</span>
                </div>
              )) : <p className="text-sm text-muted-foreground">Aucune donnee admin disponible ou permission insuffisante.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
