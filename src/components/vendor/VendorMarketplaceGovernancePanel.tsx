import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { VendorShop } from "@/hooks/useVendorShop";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type QueryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

type WorkflowCase = {
  id: string;
  case_number: string;
  created_at: string;
  case_type_label: string | null;
  priority: "critical" | "high" | "normal" | "low";
  confidence_score: number;
  status: string;
  workflow_status_code: string;
  workflow_status_label: string | null;
  vendor_shop_id: string;
  product_name: string | null;
  problem: string;
  explanation: string;
  recommended_actions: string[];
  final_decision: string | null;
  due_at: string | null;
  comments_count: number;
  checklist_count: number;
  checklist_completed_count: number;
};

type WorkflowComment = {
  id: string;
  case_id: string;
  created_at: string;
  author_type: string;
  comment_type: string;
  body: string;
};

type ChecklistItem = {
  id: string;
  case_id: string;
  label: string;
  description: string | null;
  is_required: boolean;
  is_completed: boolean;
  sort_order: number;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  severity: string;
  read_at: string | null;
  created_at: string;
};

type ComplianceFinding = {
  id: string;
  finding_number: string;
  created_at: string;
  queue_status: string;
  severity: string;
  compliance_score: number;
  title: string;
  justification: string;
  recommended_actions: unknown[];
  product_name: string | null;
  product_image_url: string | null;
  policy_name: string;
  policy_category: string;
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
  waiting_vendor: "Action attendue",
  vendor_replied: "Reponse envoyee",
  to_validate: "A valider",
  resolved: "Resolu",
  closed: "Cloture",
  reopened: "Reouvert",
};

export default function VendorMarketplaceGovernancePanel({ shop }: { shop: VendorShop }) {
  const [cases, setCases] = useState<WorkflowCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [complianceFindings, setComplianceFindings] = useState<ComplianceFinding[]>([]);
  const [selectedCase, setSelectedCase] = useState<WorkflowCase | null>(null);
  const [comments, setComments] = useState<WorkflowComment[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const loadCaseDetails = useCallback(async (caseId: string) => {
    const [commentsResult, checklistResult] = await Promise.all([
      db.from("my_marketplace_case_comments").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_case_checklist_items").select("*").eq("case_id", caseId).order("sort_order", { ascending: true }).limit(80),
    ]);
    if (!commentsResult.error) setComments(toArray<WorkflowComment>(commentsResult.data));
    if (!checklistResult.error) setChecklist(toArray<ChecklistItem>(checklistResult.data));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [casesResult, notificationsResult, complianceResult] = await Promise.all([
      db.from("my_marketplace_case_resolution_cases").select("*").eq("vendor_shop_id", shop.id).order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_governance_notifications").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_compliance_findings").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (!casesResult.error) {
      const rows = toArray<WorkflowCase>(casesResult.data);
      setCases(rows);
      const nextCase = rows[0] ?? null;
      setSelectedCase((current) => current ?? nextCase);
      if (nextCase) await loadCaseDetails(nextCase.id);
    }
    if (!notificationsResult.error) setNotifications(toArray<NotificationRow>(notificationsResult.data));
    if (!complianceResult.error) setComplianceFindings(toArray<ComplianceFinding>(complianceResult.data));
    if (casesResult.error) {
      toast({ title: "Workflow Marketplace indisponible", description: casesResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [loadCaseDetails, shop.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectCase = async (item: WorkflowCase) => {
    setSelectedCase(item);
    setComment("");
    await loadCaseDetails(item.id);
  };

  const sendComment = async () => {
    if (!selectedCase || !comment.trim()) return;
    setIsWorking(true);
    const { error } = await db.rpc("add_marketplace_case_comment", {
      _case_id: selectedCase.id,
      _body: comment.trim(),
      _visibility: "vendor",
      _comment_type: "evidence",
      _attachments: [],
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Reponse impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reponse envoyee", description: "L'administration LPB verra votre message dans le dossier." });
    setComment("");
    await loadData();
    await loadCaseDetails(selectedCase.id);
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/50">
        <CardContent className="flex min-h-[220px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement du workflow Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Workflow Marketplace
          </CardTitle>
          <CardDescription>
            Dossiers de qualite ou de revision visibles pour votre boutique. Les notes internes LPB ne sont jamais affichees ici.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Metric label="Dossiers visibles" value={cases.length} />
          <Metric label="Actions attendues" value={cases.filter((item) => ["waiting_vendor", "info_requested"].includes(item.workflow_status_code)).length} />
          <Metric label="Alertes conformite" value={complianceFindings.filter((item) => !["compliant", "archived"].includes(item.queue_status)).length} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={loadData} className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="cases">Dossiers</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="compliance">Conformite</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-3">
          {cases.length === 0 ? <EmptyState text="Aucun dossier visible pour votre boutique." /> : cases.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/40">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <button type="button" onClick={() => selectCase(item)} className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cream">{item.case_number}</span>
                    <Badge variant={item.priority === "critical" ? "destructive" : "outline"}>{priorityLabel[item.priority]}</Badge>
                    <Badge variant="secondary">{item.workflow_status_label || workflowStatusLabel[item.workflow_status_code] || item.workflow_status_code}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-cream">{item.problem}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.product_name || shop.name}</div>
                </button>
                <Button variant="outline" onClick={() => selectCase(item)} className="border-gold/30">
                  Voir
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="details">
          {!selectedCase ? <EmptyState text="Selectionnez un dossier." /> : (
            <Card className="border-gold/20 bg-noir/50">
              <CardHeader>
                <CardTitle className="text-cream">{selectedCase.case_number} - {selectedCase.case_type_label}</CardTitle>
                <CardDescription>{selectedCase.problem}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedCase.explanation}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Statut" value={selectedCase.workflow_status_label || workflowStatusLabel[selectedCase.workflow_status_code] || selectedCase.workflow_status_code} />
                  <Metric label="Checklist" value={`${selectedCase.checklist_completed_count}/${selectedCase.checklist_count}`} />
                  <Metric label="Commentaires" value={selectedCase.comments_count} />
                </div>
                <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                  <div className="mb-2 text-sm font-medium text-primary">Actions recommandees</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(selectedCase.recommended_actions || []).map((action) => <li key={action}>- {action}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                    <ClipboardCheck className="h-4 w-4" />
                    Checklist visible
                  </div>
                  {checklist.length === 0 ? <div className="text-sm text-muted-foreground">Aucune checklist partagee.</div> : checklist.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 py-2 text-sm">
                      {item.is_completed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <span className="mt-1 h-3 w-3 rounded-full border border-gold/40" />}
                      <div>
                        <div className="text-cream">{item.label}{item.is_required ? " *" : ""}</div>
                        {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedCase.final_decision && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    {selectedCase.final_decision}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-primary">Messages du dossier</div>
                  {comments.length === 0 ? <EmptyState text="Aucun message visible." /> : comments.map((row) => (
                    <div key={row.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">{row.author_type === "vendor" ? "Vous" : "LPB"}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      <div className="mt-2 text-sm text-cream">{row.body}</div>
                    </div>
                  ))}
                </div>
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ajouter une reponse pour l'administration LPB..." className="min-h-28 border-gold/20 bg-noir/60 text-cream" />
                <Button onClick={sendComment} disabled={isWorking || !comment.trim()} className="bg-gradient-gold text-noir">
                  {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                  Envoyer ma reponse
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-3">
          {complianceFindings.length === 0 ? <EmptyState text="Aucune alerte de conformite visible pour votre boutique." /> : complianceFindings.map((finding) => (
            <Card key={finding.id} className="border-gold/10 bg-noir/40">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-cream">{finding.finding_number}</span>
                      <Badge variant={finding.severity === "critical" ? "destructive" : "outline"}>{finding.severity}</Badge>
                      <Badge variant="secondary">{finding.queue_status}</Badge>
                    </div>
                    <div className="mt-2 text-sm font-medium text-cream">{finding.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{finding.product_name || shop.name} - {finding.policy_name}</div>
                  </div>
                  <Metric label="Score" value={`${Number(finding.compliance_score || 0).toFixed(0)}%`} />
                </div>
                <p className="text-sm text-muted-foreground">{finding.justification}</p>
                <div className="rounded-lg border border-gold/10 bg-noir/50 p-3">
                  <div className="mb-2 text-sm font-medium text-primary">Actions attendues</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {finding.recommended_actions.map((action, index) => <li key={`${finding.id}-${index}`}>- {String(action)}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3">
          {notifications.length === 0 ? <EmptyState text="Aucune notification." /> : notifications.map((notification) => (
            <Card key={notification.id} className="border-gold/10 bg-noir/40">
              <CardContent className="flex gap-3 p-4">
                {notification.severity === "critical" ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                <div>
                  <div className="font-medium text-cream">{notification.title}</div>
                  <div className="text-sm text-muted-foreground">{notification.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString("fr-FR")}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-bold text-cream">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
