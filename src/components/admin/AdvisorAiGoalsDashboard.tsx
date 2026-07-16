import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type AiGoal = {
  id: string;
  advisor_id: string;
  source_event_id: string | null;
  source_event_name: string | null;
  title: string;
  description: string | null;
  cadence: "daily" | "weekly";
  goal_type: string;
  target_metric: string;
  target_value: number;
  current_value: number;
  progress_percent: number;
  status: string;
  difficulty: string;
  priority: string;
  reward_hint: Record<string, unknown> | null;
  ai_suggestion: string | null;
  ai_rationale: Record<string, unknown> | null;
  source_context: Record<string, unknown> | null;
  starts_at: string;
  due_at: string;
  completed_at: string | null;
  created_at: string;
};

type GoalsSummary = {
  daily_remaining: number;
  weekly_remaining: number;
  completed_total: number;
  remaining_total: number;
  average_progress: number | null;
  overdue_total: number;
};

type EffectivenessRow = {
  template_id: string;
  code: string;
  title: string;
  cadence: string;
  goal_type: string;
  priority: string;
  difficulty: string;
  is_active: boolean;
  assignments_total: number;
  completed_total: number;
  open_total: number;
  not_completed_total: number;
  average_progress_percent: number | null;
  last_assigned_at: string | null;
};

type GoalTemplateForm = {
  code: string;
  title: string;
  description: string;
  cadence: string;
  goal_type: string;
  target_metric: string;
  default_target_value: string;
  difficulty: string;
  priority: string;
  specialties: string;
  client_types: string;
  opportunity_slugs: string;
  ai_prompt_template: string;
};

const db = supabase as any;

const emptyTemplateForm: GoalTemplateForm = {
  code: "",
  title: "",
  description: "",
  cadence: "daily",
  goal_type: "follow_up_prospect",
  target_metric: "count",
  default_target_value: "1",
  difficulty: "medium",
  priority: "medium",
  specialties: "",
  client_types: "",
  opportunity_slugs: "",
  ai_prompt_template: "",
};

const priorityStyles: Record<string, string> = {
  low: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  critical: "border-red-500/30 bg-red-500/10 text-red-200",
};

const statusLabels: Record<string, string> = {
  assigned: "Assigné",
  in_progress: "En cours",
  completed: "Terminé",
  skipped: "Ignoré",
  expired: "Expiré",
  cancelled: "Annulé",
};

const difficultyLabels: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
  expert: "Expert",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Non planifié";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export default function AdvisorAiGoalsDashboard() {
  const [goals, setGoals] = useState<AiGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [effectiveness, setEffectiveness] = useState<EffectivenessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [cadenceFilter, setCadenceFilter] = useState("today");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<GoalTemplateForm>(emptyTemplateForm);

  const load = async () => {
    setLoading(true);
    const [goalsRes, summaryRes, effectivenessRes] = await Promise.all([
      db.from("advisor_ai_goals_dashboard").select("*").order("due_at", { ascending: true }).limit(180),
      db.from("advisor_ai_goals_summary").select("*").maybeSingle(),
      db.from("admin_ai_goals_effectiveness_report").select("*").order("priority", { ascending: true }).limit(200),
    ]);

    if (goalsRes.error) {
      toast({ title: "Objectifs IA non disponibles", description: goalsRes.error.message, variant: "destructive" });
    } else {
      setGoals((goalsRes.data || []) as AiGoal[]);
    }

    if (!summaryRes.error) setSummary(summaryRes.data as GoalsSummary | null);
    if (!effectivenessRes.error) setEffectiveness((effectivenessRes.data || []) as EffectivenessRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();

  const filteredGoals = useMemo(() => {
    if (cadenceFilter === "daily") return goals.filter((goal) => goal.cadence === "daily");
    if (cadenceFilter === "weekly") return goals.filter((goal) => goal.cadence === "weekly");
    if (cadenceFilter === "completed") return goals.filter((goal) => goal.status === "completed");
    return goals.filter((goal) => {
      const due = new Date(goal.due_at).getTime();
      return due >= todayStart && due <= todayEnd;
    });
  }, [goals, cadenceFilter, todayStart, todayEnd]);

  const completedCount = goals.filter((goal) => goal.status === "completed").length;
  const remainingCount = goals.filter((goal) => ["assigned", "in_progress"].includes(goal.status)).length;
  const overdueCount = goals.filter((goal) => ["assigned", "in_progress"].includes(goal.status) && new Date(goal.due_at).getTime() < Date.now()).length;

  const updateProgress = async (goal: AiGoal, delta: number) => {
    const { error } = await db.rpc("advisor_update_ai_goal_progress", {
      _assignment_id: goal.id,
      _delta: delta,
      _note: delta > 0 ? "Progression depuis le dashboard P1.3" : "Correction progression depuis le dashboard P1.3",
      _evidence: { source: "advisor_ai_goals_dashboard" },
    });
    if (error) {
      toast({ title: "Progression impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Objectif mis à jour" });
    void load();
  };

  const generateGoals = async (cadence: "daily" | "weekly") => {
    setGenerating(true);
    const { data, error } = await db.rpc("admin_generate_advisor_ai_goals", {
      _cadence: cadence,
      _advisor_id: null,
      _limit: 150,
    });
    setGenerating(false);

    if (error) {
      toast({ title: "Génération impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Objectifs générés", description: `${data?.assignments_created ?? 0} objectifs créés.` });
    void load();
  };

  const createTemplate = async () => {
    if (!templateForm.title.trim()) {
      toast({ title: "Titre manquant", variant: "destructive" });
      return;
    }

    setSavingTemplate(true);
    const code = templateForm.code.trim() || slugify(templateForm.title);
    const { error } = await db.from("advisor_goal_templates").insert({
      code,
      title: templateForm.title.trim(),
      description: templateForm.description.trim() || null,
      cadence: templateForm.cadence,
      goal_type: templateForm.goal_type,
      target_metric: templateForm.target_metric,
      default_target_value: Number(templateForm.default_target_value || 1),
      difficulty: templateForm.difficulty,
      priority: templateForm.priority,
      specialties: splitList(templateForm.specialties),
      client_types: splitList(templateForm.client_types),
      opportunity_slugs: splitList(templateForm.opportunity_slugs),
      ai_prompt_template: templateForm.ai_prompt_template.trim() || null,
      success_criteria: { source: "admin_template_creation" },
    });
    setSavingTemplate(false);

    if (error) {
      toast({ title: "Création impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Modèle d'objectif créé" });
    setTemplateForm(emptyTemplateForm);
    setTemplateDialogOpen(false);
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-gold/20 bg-noir/50 text-cream">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Chargement des objectifs IA...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">P1.3 Objectifs IA Conseiller</h2>
          <p className="text-sm text-muted-foreground">
            Transforme le CRM et le Calendrier IA en actions quotidiennes et hebdomadaires, sans flux financier.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Modèle
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={Target} label="Objectifs restants" value={summary?.remaining_total ?? remainingCount} />
        <KpiCard icon={CheckCircle2} label="Terminés" value={summary?.completed_total ?? completedCount} tone="success" />
        <KpiCard icon={Clock} label="En retard" value={summary?.overdue_total ?? overdueCount} tone="warning" />
        <KpiCard icon={Activity} label="Progression moyenne" value={`${Math.round(Number(summary?.average_progress || 0))}%`} />
      </div>

      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            Logique de personnalisation
          </CardTitle>
          <CardDescription>
            Les objectifs tiennent compte du CRM, des opportunités commerciales, du niveau, de la spécialité, de la disponibilité, du Trust Score et du Business Score quand ils sont disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Insight label="Débutant" value="Objectifs simples, moins nombreux, plus guidés." />
          <Insight label="Spécialiste" value="Objectifs orientés champagne, entreprise, mariage ou région." />
          <Insight label="P0 protégé" value="Aucun wallet, commission, commande ou calcul financier modifié." />
        </CardContent>
      </Card>

      <Tabs defaultValue="advisor">
        <TabsList>
          <TabsTrigger value="advisor">Conseiller</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="advisor" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="daily">Quotidiens</SelectItem>
                <SelectItem value="weekly">Hebdomadaires</SelectItem>
                <SelectItem value="completed">Terminés</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => generateGoals("daily")} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                Générer jour
              </Button>
              <Button variant="outline" onClick={() => generateGoals("weekly")} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                Générer semaine
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onProgress={updateProgress} />
            ))}
          </div>
          {filteredGoals.length === 0 && (
            <p className="rounded-lg border border-dashed border-gold/20 p-8 text-center text-sm text-muted-foreground">
              Aucun objectif dans cette vue. L'admin peut générer des objectifs depuis ce dashboard.
            </p>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <Card className="border-gold/20 bg-noir/50">
            <CardHeader>
              <CardTitle className="text-primary">Historique des objectifs</CardTitle>
              <CardDescription>Progression, statut et source IA des objectifs récents.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gold/10 text-left text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3">Objectif</th>
                    <th className="py-3 pr-3">Cadence</th>
                    <th className="py-3 pr-3">Statut</th>
                    <th className="py-3 pr-3">Progression</th>
                    <th className="py-3">Échéance</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => (
                    <tr key={goal.id} className="border-b border-gold/5">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-cream">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">{goal.source_event_name || goal.goal_type}</p>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{goal.cadence}</td>
                      <td className="py-3 pr-3"><Badge variant="outline">{statusLabels[goal.status] || goal.status}</Badge></td>
                      <td className="py-3 pr-3 text-primary">{Math.round(Number(goal.progress_percent || 0))}%</td>
                      <td className="py-3 text-muted-foreground">{formatDate(goal.due_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4 pt-4">
          <Card className="border-gold/20 bg-noir/50">
            <CardHeader>
              <CardTitle className="text-primary">Efficacité des modèles</CardTitle>
              <CardDescription>Analyse des objectifs les plus utiles et des taux de réussite.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gold/10 text-left text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3">Modèle</th>
                    <th className="py-3 pr-3">Cadence</th>
                    <th className="py-3 pr-3">Assignés</th>
                    <th className="py-3 pr-3">Terminés</th>
                    <th className="py-3 pr-3">Progression</th>
                    <th className="py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveness.map((row) => (
                    <tr key={row.template_id} className="border-b border-gold/5">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-cream">{row.title}</p>
                        <p className="text-xs text-muted-foreground">{row.code}</p>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{row.cadence}</td>
                      <td className="py-3 pr-3 text-cream">{row.assignments_total}</td>
                      <td className="py-3 pr-3 text-emerald-300">{row.completed_total}</td>
                      <td className="py-3 pr-3 text-primary">{Math.round(Number(row.average_progress_percent || 0))}%</td>
                      <td className="py-3"><Badge variant="outline">{row.is_active ? "Actif" : "Inactif"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {effectiveness.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée admin disponible.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-3xl border-gold/20 bg-noir text-cream">
          <DialogHeader>
            <DialogTitle className="text-primary">Créer un modèle d'objectif</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
            <Field label="Titre">
              <Input value={templateForm.title} onChange={(event) => setTemplateForm((prev) => ({ ...prev, title: event.target.value, code: prev.code || slugify(event.target.value) }))} />
            </Field>
            <Field label="Code">
              <Input value={templateForm.code} onChange={(event) => setTemplateForm((prev) => ({ ...prev, code: slugify(event.target.value) }))} />
            </Field>
            <Field label="Cadence">
              <Select value={templateForm.cadence} onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, cadence: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidien</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={templateForm.goal_type} onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, goal_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="share_product">Partager produit</SelectItem>
                  <SelectItem value="follow_up_prospect">Relance prospect</SelectItem>
                  <SelectItem value="contact_dormant_client">Client dormant</SelectItem>
                  <SelectItem value="gift_offer">Coffret cadeau</SelectItem>
                  <SelectItem value="call_company">Entreprise</SelectItem>
                  <SelectItem value="wedding_offer">Mariage</SelectItem>
                  <SelectItem value="publish_story">Story</SelectItem>
                  <SelectItem value="present_new_product">Nouveauté</SelectItem>
                  <SelectItem value="sell_wholesale">Vente gros</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Objectif chiffré">
              <Input type="number" min="1" value={templateForm.default_target_value} onChange={(event) => setTemplateForm((prev) => ({ ...prev, default_target_value: event.target.value }))} />
            </Field>
            <Field label="Métrique">
              <Select value={templateForm.target_metric} onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, target_metric: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Nombre</SelectItem>
                  <SelectItem value="conversation">Conversation</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="category">Catégorie</SelectItem>
                  <SelectItem value="training">Formation</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Difficulté">
              <Select value={templateForm.difficulty} onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, difficulty: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Facile</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="hard">Difficile</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priorité">
              <Select value={templateForm.priority} onValueChange={(value) => setTemplateForm((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Spécialités ciblées">
              <Input value={templateForm.specialties} onChange={(event) => setTemplateForm((prev) => ({ ...prev, specialties: event.target.value }))} placeholder="champagne, entreprises, mariages" />
            </Field>
            <Field label="Types clients">
              <Input value={templateForm.client_types} onChange={(event) => setTemplateForm((prev) => ({ ...prev, client_types: event.target.value }))} placeholder="prospect, company, dormant" />
            </Field>
            <Field label="Opportunités liées">
              <Input value={templateForm.opportunity_slugs} onChange={(event) => setTemplateForm((prev) => ({ ...prev, opportunity_slugs: event.target.value }))} placeholder="mariages, noel" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Suggestion IA">
                <Textarea value={templateForm.ai_prompt_template} onChange={(event) => setTemplateForm((prev) => ({ ...prev, ai_prompt_template: event.target.value }))} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea value={templateForm.description} onChange={(event) => setTemplateForm((prev) => ({ ...prev, description: event.target.value }))} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Annuler</Button>
            <Button onClick={createTemplate} disabled={savingTemplate}>
              {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, onProgress }: { goal: AiGoal; onProgress: (goal: AiGoal, delta: number) => void }) {
  const progress = Math.round(Number(goal.progress_percent || 0));
  const isClosed = ["completed", "cancelled", "expired", "skipped"].includes(goal.status);

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-primary">{goal.title}</CardTitle>
            <CardDescription>{goal.description || goal.ai_suggestion || "Objectif commercial personnalisé."}</CardDescription>
          </div>
          <Badge className={priorityStyles[goal.priority] || priorityStyles.medium}>{goal.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="text-cream">{goal.current_value}/{goal.target_value} · {progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Info icon={CalendarDays} label={goal.cadence === "daily" ? "Quotidien" : "Hebdomadaire"} />
          <Info icon={Clock} label={formatDate(goal.due_at)} />
          <Info icon={Flag} label={difficultyLabels[goal.difficulty] || goal.difficulty} />
          <Info icon={Sparkles} label={goal.source_event_name || goal.goal_type} />
        </div>
        {goal.ai_suggestion && (
          <div className="rounded-lg border border-gold/10 bg-gold/5 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-primary">Suggestion IA : </span>
            {goal.ai_suggestion}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{statusLabels[goal.status] || goal.status}</Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isClosed || goal.current_value <= 0} onClick={() => onProgress(goal, -1)}>
              -1
            </Button>
            <Button size="sm" disabled={isClosed} onClick={() => onProgress(goal, 1)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              +1
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: string | number; tone?: "default" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-emerald-300" : tone === "warning" ? "text-orange-300" : "text-primary";
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${toneClass}`} />
      </CardContent>
    </Card>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
      <p className="font-medium text-cream">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gold/10 p-2 text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  );
}
