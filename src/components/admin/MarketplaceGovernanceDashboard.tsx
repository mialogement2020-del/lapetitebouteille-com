import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type Overview = {
  open_cases: number;
  critical_cases: number;
  overdue_cases: number;
  waiting_vendor_cases: number;
  resolved_cases: number;
  avg_resolution_hours: number;
  total_comments: number;
  open_escalations: number;
};

type WorkflowCase = {
  id: string;
  case_number: string;
  created_at: string;
  updated_at: string;
  case_type: string;
  case_type_label: string | null;
  priority: "critical" | "high" | "normal" | "low";
  confidence_score: number;
  status: string;
  workflow_status_code: string;
  workflow_status_label: string | null;
  source_module: string;
  shop_name: string | null;
  product_name: string | null;
  problem: string;
  explanation: string;
  recommended_actions: string[];
  data_used: Record<string, unknown>;
  potential_impacts: Record<string, unknown>;
  is_vendor_visible: boolean;
  assigned_to: string | null;
  responsible_team_id: string | null;
  responsible_team_name: string | null;
  due_at: string | null;
  time_spent_minutes: number;
  comments_count: number;
  checklist_count: number;
  checklist_completed_count: number;
  open_escalations_count: number;
  history_count: number;
  last_activity_at: string | null;
};

type WorkflowComment = {
  id: string;
  case_id: string;
  created_at: string;
  author_type: string;
  visibility: "internal" | "vendor";
  comment_type: string;
  body: string;
  attachments: unknown[];
};

type ChecklistItem = {
  id: string;
  case_id: string;
  label: string;
  description: string | null;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  note: string | null;
  sort_order: number;
};

type EscalationRow = {
  id: string;
  case_id: string;
  escalation_type: string;
  severity: string;
  reason: string;
  recommended_action: string;
  status: string;
  created_at: string;
};

type TrendRow = {
  day: string;
  total_cases: number;
  critical_cases: number;
  closed_cases: number;
  ai_created_cases: number;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  severity: string;
  read_at: string | null;
  created_at: string;
};

const db = supabase as unknown as QueryClient;
const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const priorityLabel: Record<string, string> = {
  critical: "Critique",
  high: "Elevee",
  normal: "Normale",
  low: "Faible",
};

const workflowStatusLabel: Record<string, string> = {
  new: "Nouveau",
  to_analyze: "A analyser",
  in_progress: "En cours",
  info_requested: "Info demandee",
  waiting_vendor: "Attente vendeur",
  vendor_replied: "Vendeur a repondu",
  to_validate: "A valider",
  resolved: "Resolu",
  closed: "Cloture",
  reopened: "Reouvert",
};

const workflowStatuses = Object.entries(workflowStatusLabel);

export default function MarketplaceGovernanceDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<WorkflowCase | null>(null);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState("to_analyze");
  const [internalComment, setInternalComment] = useState("");
  const [vendorComment, setVendorComment] = useState("");

  const openCases = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.workflow_status_code)),
    [cases],
  );

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, casesResult, trendsResult, notificationsResult] = await Promise.all([
      db.from("admin_marketplace_case_resolution_overview").select("*").maybeSingle(),
      db.from("admin_marketplace_case_resolution_queue").select("*").order("created_at", { ascending: false }).limit(150),
      db.from("admin_marketplace_governance_trends").select("*").order("day", { ascending: false }).limit(90),
      db.from("admin_marketplace_governance_notifications").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!casesResult.error) setCases(toArray<WorkflowCase>(casesResult.data));
    if (!trendsResult.error) setTrends(toArray<TrendRow>(trendsResult.data));
    if (!notificationsResult.error) setNotifications(toArray<NotificationRow>(notificationsResult.data));
    if (overviewResult.error) {
      toast({ title: "Workflow Marketplace indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const loadCaseResolution = async (caseId: string) => {
    const [commentsResult, checklistResult, escalationsResult] = await Promise.all([
      db.from("admin_marketplace_case_comments").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(120),
      db.from("admin_marketplace_case_checklist_items").select("*").eq("case_id", caseId).order("sort_order", { ascending: true }).limit(80),
      db.from("admin_marketplace_case_escalations").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(40),
    ]);

    if (!commentsResult.error) setComments(toArray<WorkflowComment>(commentsResult.data));
    if (!checklistResult.error) setChecklist(toArray<ChecklistItem>(checklistResult.data));
    if (!escalationsResult.error) setEscalations(toArray<EscalationRow>(escalationsResult.data));
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectCase = async (item: WorkflowCase) => {
    setSelectedCase(item);
    setWorkflowStatus(item.workflow_status_code || "to_analyze");
    setInternalComment("");
    setVendorComment("");
    await loadCaseResolution(item.id);
  };

  const scanCases = async () => {
    setIsWorking(true);
    const { data, error } = await db.rpc("scan_marketplace_governance_cases", { _limit: 150 });
    setIsWorking(false);
    if (error) {
      toast({ title: "Scan impossible", description: error.message, variant: "destructive" });
      return;
    }
    const created = (data as { created_cases?: number } | null)?.created_cases ?? 0;
    toast({ title: "Scan de gouvernance termine", description: `${created} dossier(s) cree(s).` });
    await loadData();
  };

  const initializeCase = async () => {
    if (!selectedCase) return;
    setIsWorking(true);
    const { error } = await db.rpc("initialize_marketplace_case_resolution", { _case_id: selectedCase.id });
    setIsWorking(false);
    if (error) {
      toast({ title: "Initialisation impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Workflow initialise", description: "Checklist et statut de traitement prepares." });
    await refreshSelectedCase(selectedCase.id);
  };

  const scanEscalations = async () => {
    setIsWorking(true);
    const { data, error } = await db.rpc("scan_marketplace_case_escalations", { _limit: 100 });
    setIsWorking(false);
    if (error) {
      toast({ title: "Escalade impossible", description: error.message, variant: "destructive" });
      return;
    }
    const created = (data as { created_escalations?: number } | null)?.created_escalations ?? 0;
    toast({ title: "Escalades proposees", description: `${created} proposition(s), aucune decision automatique.` });
    if (selectedCase) await loadCaseResolution(selectedCase.id);
    await loadData();
  };

  const suggestAssignee = async () => {
    if (!selectedCase) return;
    const { data, error } = await db.rpc("suggest_marketplace_case_assignees", { _case_id: selectedCase.id });
    if (error) {
      toast({ title: "Suggestion indisponible", description: error.message, variant: "destructive" });
      return;
    }
    const suggestion = Array.isArray(data) ? data[0] as { team_name?: string; rationale?: string } : null;
    toast({
      title: suggestion?.team_name ? `Equipe suggeree : ${suggestion.team_name}` : "Aucune equipe suggeree",
      description: suggestion?.rationale || "La suggestion reste indicative et doit etre validee par un admin.",
    });
  };

  const transitionCase = async () => {
    if (!selectedCase) return;
    setIsWorking(true);
    const { error } = await db.rpc("transition_marketplace_governance_case", {
      _case_id: selectedCase.id,
      _workflow_status_code: workflowStatus,
      _comment: internalComment || null,
      _vendor_visible: null,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Transition impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Workflow mis a jour", description: "La transition a ete journalisee." });
    setInternalComment("");
    await refreshSelectedCase(selectedCase.id);
  };

  const addComment = async (visibility: "internal" | "vendor") => {
    if (!selectedCase) return;
    const body = visibility === "internal" ? internalComment.trim() : vendorComment.trim();
    if (!body) return;
    setIsWorking(true);
    const { error } = await db.rpc("add_marketplace_case_comment", {
      _case_id: selectedCase.id,
      _body: body,
      _visibility: visibility,
      _comment_type: visibility === "internal" ? "internal_note" : "comment",
      _attachments: [],
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Commentaire impossible", description: error.message, variant: "destructive" });
      return;
    }
    if (visibility === "internal") setInternalComment("");
    if (visibility === "vendor") setVendorComment("");
    toast({ title: "Commentaire ajoute", description: visibility === "vendor" ? "Visible cote vendeur." : "Note interne ajoutee." });
    await loadCaseResolution(selectedCase.id);
  };

  const toggleChecklist = async (item: ChecklistItem, checked: boolean) => {
    setIsWorking(true);
    const { error } = await db.rpc("update_marketplace_case_checklist_item", {
      _item_id: item.id,
      _is_completed: checked,
      _note: item.note || null,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Checklist impossible", description: error.message, variant: "destructive" });
      return;
    }
    if (selectedCase) await loadCaseResolution(selectedCase.id);
  };

  const refreshSelectedCase = async (caseId: string) => {
    await loadData();
    await loadCaseResolution(caseId);
    const { data } = await db.from("admin_marketplace_case_resolution_queue").select("*").eq("id", caseId).maybeSingle();
    if (data) {
      const row = data as WorkflowCase;
      setSelectedCase(row);
      setWorkflowStatus(row.workflow_status_code || "to_analyze");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du workflow Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P3.2 Workflow & Case Resolution</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Dossiers Marketplace assignables, commentes, controles par checklist et escalades proposees. Aucune validation sensible n'est automatique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={scanEscalations} disabled={isWorking} className="border-gold/30">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Escalades
          </Button>
          <Button onClick={scanCases} disabled={isWorking} className="bg-gradient-gold text-noir">
            {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Scanner
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Dossiers ouverts" value={overview?.open_cases || 0} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard label="Critiques" value={overview?.critical_cases || 0} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" />
        <MetricCard label="En retard" value={overview?.overdue_cases || 0} icon={<Clock className="h-5 w-5" />} />
        <MetricCard label="Escalades proposees" value={overview?.open_escalations || 0} icon={<UserCheck className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="queue">File de resolution</TabsTrigger>
          <TabsTrigger value="case">Dossier</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {openCases.length === 0 ? <EmptyState text="Aucun dossier ouvert. Lance le scan pour detecter les anomalies P2." /> : openCases.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_260px_160px] md:items-center">
                <button type="button" onClick={() => selectCase(item)} className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cream">{item.case_number}</span>
                    <Badge variant={item.priority === "critical" ? "destructive" : "outline"}>{priorityLabel[item.priority]}</Badge>
                    <Badge variant="secondary">{item.workflow_status_label || workflowStatusLabel[item.workflow_status_code]}</Badge>
                    {item.open_escalations_count > 0 && <Badge variant="destructive">{item.open_escalations_count} escalade</Badge>}
                  </div>
                  <div className="mt-2 font-medium text-cream">{item.problem}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.shop_name || "Marketplace"} {item.product_name ? `- ${item.product_name}` : ""}</div>
                </button>
                <div className="text-sm text-muted-foreground">
                  <div>Equipe : {item.responsible_team_name || "Non assignee"}</div>
                  <div>Checklist : {item.checklist_completed_count}/{item.checklist_count}</div>
                  <div>Commentaires : {item.comments_count}</div>
                  {item.due_at && <div>Echeance : {new Date(item.due_at).toLocaleDateString("fr-FR")}</div>}
                </div>
                <Button variant="outline" onClick={() => selectCase(item)} className="border-gold/30">
                  Examiner
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="case">
          {!selectedCase ? <EmptyState text="Selectionne un dossier dans la file de resolution." /> : (
            <div className="grid gap-4 lg:grid-cols-[1fr_430px]">
              <Card className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="text-cream">{selectedCase.case_number} - {selectedCase.case_type_label || selectedCase.case_type}</CardTitle>
                  <CardDescription>{selectedCase.problem}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedCase.explanation}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <MetricInline label="Equipe" value={selectedCase.responsible_team_name || "Non assignee"} />
                    <MetricInline label="Temps passe" value={`${selectedCase.time_spent_minutes || 0} min`} />
                    <MetricInline label="Confiance" value={`${Number(selectedCase.confidence_score || 0).toFixed(0)}%`} />
                  </div>
                  <InfoBlock title="Actions recommandees" value={selectedCase.recommended_actions} />
                  <InfoBlock title="Donnees utilisees" value={selectedCase.data_used} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-muted-foreground">Statut workflow</label>
                      <Select value={workflowStatus} onValueChange={setWorkflowStatus}>
                        <SelectTrigger className="border-gold/20 bg-noir/60 text-cream"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {workflowStatuses.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button variant="outline" onClick={initializeCase} disabled={isWorking} className="border-gold/30">
                        Initialiser
                      </Button>
                      <Button variant="outline" onClick={suggestAssignee} disabled={isWorking} className="border-gold/30">
                        Suggérer
                      </Button>
                    </div>
                  </div>
                  <Textarea value={internalComment} onChange={(event) => setInternalComment(event.target.value)} placeholder="Note interne ou justification de transition..." className="min-h-24 border-gold/20 bg-noir/60 text-cream" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={transitionCase} disabled={isWorking} className="bg-gradient-gold text-noir">
                      {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Changer le statut
                    </Button>
                    <Button variant="outline" onClick={() => addComment("internal")} disabled={isWorking || !internalComment.trim()} className="border-gold/30">
                      Note interne
                    </Button>
                  </div>
                  <Textarea value={vendorComment} onChange={(event) => setVendorComment(event.target.value)} placeholder="Message visible par le vendeur..." className="min-h-24 border-gold/20 bg-noir/60 text-cream" />
                  <Button variant="outline" onClick={() => addComment("vendor")} disabled={isWorking || !vendorComment.trim()} className="border-gold/30">
                    Envoyer au vendeur
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="border-gold/20 bg-noir/60">
                  <CardHeader>
                    <CardTitle className="text-cream">Checklist de resolution</CardTitle>
                    <CardDescription>Preuves et etapes a valider avant cloture.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {checklist.length === 0 ? <EmptyState text="Aucune checklist. Initialise le workflow." /> : checklist.map((item) => (
                      <label key={item.id} className="flex gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3">
                        <Checkbox checked={item.is_completed} onCheckedChange={(checked) => toggleChecklist(item, checked === true)} />
                        <span>
                          <span className="block text-sm font-medium text-cream">{item.label}{item.is_required ? " *" : ""}</span>
                          {item.description && <span className="block text-xs text-muted-foreground">{item.description}</span>}
                        </span>
                      </label>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-gold/20 bg-noir/60">
                  <CardHeader>
                    <CardTitle className="text-cream">Commentaires append-only</CardTitle>
                    <CardDescription>Interne ou visible vendeur, sans ecrasement.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {comments.length === 0 ? <EmptyState text="Aucun commentaire." /> : comments.map((row) => (
                      <div key={row.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={row.visibility === "vendor" ? "secondary" : "outline"}>{row.visibility === "vendor" ? "Vendeur" : "Interne"}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("fr-FR")}</span>
                        </div>
                        <div className="mt-2 text-sm text-cream">{row.body}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-gold/20 bg-noir/60">
                  <CardHeader>
                    <CardTitle className="text-cream">Escalades proposees</CardTitle>
                    <CardDescription>Propositions uniquement, validation humaine requise.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {escalations.length === 0 ? <EmptyState text="Aucune escalade." /> : escalations.map((row) => (
                      <div key={row.id} className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{row.severity}</Badge>
                          <span className="text-sm font-medium text-cream">{row.escalation_type}</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{row.reason}</div>
                        <div className="mt-1 text-sm text-cream">{row.recommended_action}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-3">
          {trends.length === 0 ? <EmptyState text="Pas encore de tendance." /> : trends.map((row) => (
            <div key={row.day} className="grid gap-3 rounded-lg border border-gold/10 bg-noir/40 p-3 md:grid-cols-5">
              <div className="text-sm text-muted-foreground">{new Date(row.day).toLocaleDateString("fr-FR")}</div>
              <MetricInline label="Total" value={row.total_cases} />
              <MetricInline label="Critiques" value={row.critical_cases} />
              <MetricInline label="Clotures" value={row.closed_cases} />
              <MetricInline label="IA" value={row.ai_created_cases} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3">
          {notifications.length === 0 ? <EmptyState text="Aucune notification." /> : notifications.map((notification) => (
            <Card key={notification.id} className="border-gold/10 bg-noir/50">
              <CardContent className="flex gap-3 p-4">
                {notification.severity === "critical" ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                <div>
                  <div className="font-medium text-cream">{notification.title}</div>
                  <div className="text-sm text-muted-foreground">{notification.message}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon, tone = "default" }: { label: string; value: number; icon: React.ReactNode; tone?: "default" | "danger" }) {
  return (
    <Card className="border-gold/20 bg-noir/60">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className={tone === "danger" ? "mt-2 text-3xl font-bold text-red-400" : "mt-2 text-3xl font-bold text-cream"}>{value}</div>
        </div>
        <div className="text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function MetricInline({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="text-sm text-cream"><span className="text-muted-foreground">{label} : </span>{value}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function InfoBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
      <div className="mb-2 text-sm font-medium text-primary">{title}</div>
      <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
