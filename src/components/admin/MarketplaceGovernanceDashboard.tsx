import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Clock,
  ListChecks,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Zap,
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

type AutomationOverview = {
  active_rules: number;
  inactive_rules: number;
  pending_jobs: number;
  failed_jobs: number;
  executions_24h: number;
  failed_executions_24h: number;
  avg_duration_ms_7d: number;
  open_tasks: number;
};

type AutomationRule = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  actions: unknown[];
  priority: number;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  last_error: string | null;
  pending_jobs: number;
  failed_executions: number;
  avg_duration_ms: number;
};

type AutomationQueueItem = {
  id: string;
  rule_name: string;
  case_number: string | null;
  trigger_event: string;
  status: string;
  scheduled_for: string;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
};

type AutomationExecution = {
  id: string;
  rule_name: string | null;
  case_number: string | null;
  trigger_event: string;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
};

type AutomationTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  due_at: string | null;
  case_number: string | null;
  rule_name: string | null;
  created_at: string;
};

type AutomationActionType = "send_notification" | "create_task" | "schedule_reminder" | "assign_checklist" | "request_information" | "propose_escalation";

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
  const [automationOverview, setAutomationOverview] = useState<AutomationOverview | null>(null);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [automationQueue, setAutomationQueue] = useState<AutomationQueueItem[]>([]);
  const [automationExecutions, setAutomationExecutions] = useState<AutomationExecution[]>([]);
  const [automationTasks, setAutomationTasks] = useState<AutomationTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState("to_analyze");
  const [internalComment, setInternalComment] = useState("");
  const [vendorComment, setVendorComment] = useState("");
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState("case_created");
  const [newRuleAction, setNewRuleAction] = useState<AutomationActionType>("send_notification");
  const [newRulePriority, setNewRulePriority] = useState(100);

  const openCases = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.workflow_status_code)),
    [cases],
  );

  const loadData = async () => {
    setIsLoading(true);
    const [
      overviewResult,
      casesResult,
      trendsResult,
      notificationsResult,
      automationOverviewResult,
      automationRulesResult,
      automationQueueResult,
      automationExecutionsResult,
      automationTasksResult,
    ] = await Promise.all([
      db.from("admin_marketplace_case_resolution_overview").select("*").maybeSingle(),
      db.from("admin_marketplace_case_resolution_queue").select("*").order("created_at", { ascending: false }).limit(150),
      db.from("admin_marketplace_governance_trends").select("*").order("day", { ascending: false }).limit(90),
      db.from("admin_marketplace_governance_notifications").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("admin_marketplace_workflow_automation_overview").select("*").maybeSingle(),
      db.from("admin_marketplace_workflow_automation_rules").select("*").order("priority", { ascending: true }).limit(80),
      db.from("admin_marketplace_workflow_automation_queue").select("*").order("scheduled_for", { ascending: true }).limit(80),
      db.from("admin_marketplace_workflow_automation_executions").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("admin_marketplace_workflow_automation_tasks").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!casesResult.error) setCases(toArray<WorkflowCase>(casesResult.data));
    if (!trendsResult.error) setTrends(toArray<TrendRow>(trendsResult.data));
    if (!notificationsResult.error) setNotifications(toArray<NotificationRow>(notificationsResult.data));
    if (!automationOverviewResult.error) setAutomationOverview((automationOverviewResult.data as AutomationOverview | null) ?? null);
    if (!automationRulesResult.error) setAutomationRules(toArray<AutomationRule>(automationRulesResult.data));
    if (!automationQueueResult.error) setAutomationQueue(toArray<AutomationQueueItem>(automationQueueResult.data));
    if (!automationExecutionsResult.error) setAutomationExecutions(toArray<AutomationExecution>(automationExecutionsResult.data));
    if (!automationTasksResult.error) setAutomationTasks(toArray<AutomationTask>(automationTasksResult.data));
    if (overviewResult.error) {
      toast({ title: "Workflow Marketplace indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    if (automationOverviewResult.error) {
      toast({ title: "Automations Marketplace indisponibles", description: automationOverviewResult.error.message, variant: "destructive" });
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

  const buildAutomationActions = (actionType: AutomationActionType) => {
    if (actionType === "send_notification") {
      return [{
        type: "send_notification",
        recipient_role: "admin",
        title: newRuleName.trim() || "Automation Marketplace",
        message: "Evenement detecte par le moteur P3.3. Revue humaine requise si la decision est sensible.",
        severity: "normal",
      }];
    }
    if (actionType === "create_task") {
      return [{ type: "create_task", title: newRuleName.trim() || "Tache automatique", description: "Tache preparee par le moteur P3.3." }];
    }
    if (actionType === "schedule_reminder") {
      return [{ type: "schedule_reminder", title: newRuleName.trim() || "Rappel automatique", description: "Rappel de suivi Marketplace.", delay_hours: 24 }];
    }
    if (actionType === "assign_checklist") {
      return [{ type: "assign_checklist" }];
    }
    if (actionType === "request_information") {
      return [{ type: "request_information", title: "Information vendeur requise", description: newRuleName.trim() || "Demander une precision au vendeur." }];
    }
    return [{
      type: "propose_escalation",
      escalation_type: "workflow_review",
      severity: "high",
      reason: newRuleName.trim() || "Le workflow demande une revue humaine.",
      recommended_action: "Examiner le dossier et valider manuellement la suite.",
    }];
  };

  const createAutomationRule = async () => {
    const name = newRuleName.trim();
    if (!name) {
      toast({ title: "Nom requis", description: "Donne un nom clair a la regle d'automation.", variant: "destructive" });
      return;
    }
    setIsWorking(true);
    const { error } = await db.rpc("admin_create_marketplace_workflow_automation_rule", {
      _name: name,
      _description: "Regle P3.3 creee depuis la console admin. Elle prepare uniquement une action non sensible.",
      _trigger_event: newRuleTrigger,
      _conditions: {},
      _actions: buildAutomationActions(newRuleAction),
      _priority: newRulePriority,
      _is_active: true,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Creation impossible", description: error.message, variant: "destructive" });
      return;
    }
    setNewRuleName("");
    toast({ title: "Regle creee", description: "Elle est active, auditable et limitee aux actions non sensibles." });
    await loadData();
  };

  const toggleAutomationRule = async (rule: AutomationRule) => {
    setIsWorking(true);
    const { error } = await db.rpc("admin_toggle_marketplace_workflow_automation_rule", {
      _rule_id: rule.id,
      _is_active: !rule.is_active,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Changement impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: rule.is_active ? "Regle desactivee" : "Regle activee", description: "La modification est journalisee cote base." });
    await loadData();
  };

  const processAutomationQueue = async () => {
    setIsWorking(true);
    const { data, error } = await db.rpc("process_marketplace_workflow_automation_queue", { _limit: 50 });
    setIsWorking(false);
    if (error) {
      toast({ title: "Traitement impossible", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { processed?: number; success?: number; failed?: number } | null;
    toast({
      title: "Automations traitees",
      description: `${result?.processed ?? 0} job(s), ${result?.success ?? 0} reussi(s), ${result?.failed ?? 0} erreur(s).`,
    });
    await loadData();
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
          <h2 className="font-serif text-3xl text-primary">P3.2/P3.3 Workflow Governance</h2>
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
          <TabsTrigger value="automation">Automations</TabsTrigger>
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

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Regles actives" value={automationOverview?.active_rules || 0} icon={<Zap className="h-5 w-5" />} />
            <MetricCard label="Jobs en attente" value={automationOverview?.pending_jobs || 0} icon={<Clock className="h-5 w-5" />} />
            <MetricCard label="Executions 24h" value={automationOverview?.executions_24h || 0} icon={<Play className="h-5 w-5" />} />
            <MetricCard label="Taches ouvertes" value={automationOverview?.open_tasks || 0} icon={<ListChecks className="h-5 w-5" />} />
          </div>

          <Card className="border-gold/20 bg-noir/60">
            <CardHeader>
              <CardTitle className="text-cream">P3.3 Workflow Automation & Orchestration</CardTitle>
              <CardDescription>
                Automations limitees aux notifications, rappels, checklists, taches et propositions. Aucune decision sensible n'est appliquee automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_200px_220px_120px_auto]">
                <Input
                  value={newRuleName}
                  onChange={(event) => setNewRuleName(event.target.value)}
                  placeholder="Nom de la regle, ex. Relance dossier vendeur"
                  className="border-gold/20 bg-noir/60 text-cream"
                />
                <Select value={newRuleTrigger} onValueChange={setNewRuleTrigger}>
                  <SelectTrigger className="border-gold/20 bg-noir/60 text-cream"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case_created">Dossier cree</SelectItem>
                    <SelectItem value="status_changed">Statut change</SelectItem>
                    <SelectItem value="case_assigned">Assigne</SelectItem>
                    <SelectItem value="comment_added">Commentaire</SelectItem>
                    <SelectItem value="vendor_replied">Reponse vendeur</SelectItem>
                    <SelectItem value="due_reached">Echeance</SelectItem>
                    <SelectItem value="manual">Manuel</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newRuleAction} onValueChange={(value) => setNewRuleAction(value as AutomationActionType)}>
                  <SelectTrigger className="border-gold/20 bg-noir/60 text-cream"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_notification">Notifier admin</SelectItem>
                    <SelectItem value="create_task">Creer tache</SelectItem>
                    <SelectItem value="schedule_reminder">Programmer rappel</SelectItem>
                    <SelectItem value="assign_checklist">Ajouter checklist</SelectItem>
                    <SelectItem value="request_information">Demander info</SelectItem>
                    <SelectItem value="propose_escalation">Proposer escalade</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={newRulePriority}
                  onChange={(event) => setNewRulePriority(Number(event.target.value || 100))}
                  className="border-gold/20 bg-noir/60 text-cream"
                />
                <Button onClick={createAutomationRule} disabled={isWorking} className="bg-gradient-gold text-noir">
                  Creer
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={processAutomationQueue} disabled={isWorking} className="border-gold/30">
                  {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Traiter la file
                </Button>
                <Button variant="outline" onClick={loadData} disabled={isWorking} className="border-gold/30">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rafraichir
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Regles d'orchestration</CardTitle>
                <CardDescription>Activation manuelle et suivi des erreurs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationRules.length === 0 ? <EmptyState text="Aucune regle P3.3." /> : automationRules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-cream">{rule.name}</div>
                        <div className="text-xs text-muted-foreground">{rule.trigger_event} - priorite {rule.priority}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleAutomationRule(rule)} disabled={isWorking} className="border-gold/30">
                        {rule.is_active ? "Desactiver" : "Activer"}
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                      <MetricInline label="Etat" value={rule.is_active ? "Active" : "Inactive"} />
                      <MetricInline label="Runs" value={rule.run_count || 0} />
                      <MetricInline label="Attente" value={rule.pending_jobs || 0} />
                      <MetricInline label="Erreurs" value={rule.failed_executions || 0} />
                    </div>
                    {rule.last_error && <div className="mt-2 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">{rule.last_error}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">File d'attente</CardTitle>
                <CardDescription>Jobs prepares par les evenements, traitement explicite.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationQueue.length === 0 ? <EmptyState text="Aucun job en file." /> : automationQueue.map((job) => (
                  <div key={job.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-cream">{job.rule_name}</span>
                      <Badge variant={job.status === "failed" ? "destructive" : "outline"}>{job.status}</Badge>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <MetricInline label="Dossier" value={job.case_number || "-"} />
                      <MetricInline label="Trigger" value={job.trigger_event} />
                      <MetricInline label="Tentatives" value={job.attempt_count || 0} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Planifie : {new Date(job.scheduled_for).toLocaleString("fr-FR")}</div>
                    {job.last_error && <div className="mt-2 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">{job.last_error}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Executions recentes</CardTitle>
                <CardDescription>Journal append-only des traitements P3.3.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationExecutions.length === 0 ? <EmptyState text="Aucune execution." /> : automationExecutions.map((execution) => (
                  <div key={execution.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-cream">{execution.rule_name || "Regle supprimee"}</span>
                      <Badge variant={execution.status === "failed" ? "destructive" : "secondary"}>{execution.status}</Badge>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <MetricInline label="Dossier" value={execution.case_number || "-"} />
                      <MetricInline label="Duree" value={`${execution.duration_ms || 0} ms`} />
                      <MetricInline label="Date" value={new Date(execution.created_at).toLocaleString("fr-FR")} />
                    </div>
                    {execution.error_message && <div className="mt-2 rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">{execution.error_message}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-gold/20 bg-noir/60">
              <CardHeader>
                <CardTitle className="text-cream">Taches et rappels</CardTitle>
                <CardDescription>Travail prepare pour une validation humaine.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationTasks.length === 0 ? <EmptyState text="Aucune tache automation." /> : automationTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-cream">{task.title}</span>
                      <Badge variant={task.status === "open" ? "outline" : "secondary"}>{task.status}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{task.description || "Sans description"}</div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <MetricInline label="Type" value={task.task_type} />
                      <MetricInline label="Dossier" value={task.case_number || "-"} />
                      <MetricInline label="Echeance" value={task.due_at ? new Date(task.due_at).toLocaleDateString("fr-FR") : "-"} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
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
