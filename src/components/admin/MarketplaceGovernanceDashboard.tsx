import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, Clock, Loader2, MessageSquare, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  waiting_cases: number;
  closed_cases: number;
  avg_resolution_hours: number;
  cases_7d: number;
  cases_30d: number;
  active_case_types: string[];
};

type GovernanceCase = {
  id: string;
  case_number: string;
  created_at: string;
  updated_at: string;
  case_type: string;
  case_type_label: string | null;
  priority: "critical" | "high" | "normal" | "low";
  confidence_score: number;
  status: "new" | "in_progress" | "waiting" | "validated" | "refused" | "archived";
  source_module: string;
  shop_name: string | null;
  product_name: string | null;
  problem: string;
  explanation: string;
  recommended_actions: string[];
  data_used: Record<string, unknown>;
  potential_impacts: Record<string, unknown>;
  is_vendor_visible: boolean;
  final_decision: string | null;
  history_count: number;
  last_activity_at: string | null;
};

type HistoryRow = {
  id: string;
  case_id: string;
  created_at: string;
  actor_type: string;
  action_type: string;
  old_status: string | null;
  new_status: string | null;
  old_priority: string | null;
  new_priority: string | null;
  comment: string | null;
  explanation: string | null;
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

const statusLabel: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  waiting: "En attente",
  validated: "Valide",
  refused: "Refuse",
  archived: "Archive",
};

export default function MarketplaceGovernanceDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cases, setCases] = useState<GovernanceCase[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<GovernanceCase | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("in_progress");
  const [priority, setPriority] = useState("normal");

  const openCases = useMemo(() => cases.filter((item) => ["new", "in_progress", "waiting"].includes(item.status)), [cases]);

  const loadData = async () => {
    setIsLoading(true);
    const [overviewResult, casesResult, trendsResult, notificationsResult] = await Promise.all([
      db.from("admin_marketplace_governance_overview").select("*").maybeSingle(),
      db.from("admin_marketplace_governance_queue").select("*").order("created_at", { ascending: false }).limit(150),
      db.from("admin_marketplace_governance_trends").select("*").order("day", { ascending: false }).limit(90),
      db.from("admin_marketplace_governance_notifications").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (!overviewResult.error) setOverview((overviewResult.data as Overview | null) ?? null);
    if (!casesResult.error) setCases(toArray<GovernanceCase>(casesResult.data));
    if (!trendsResult.error) setTrends(toArray<TrendRow>(trendsResult.data));
    if (!notificationsResult.error) setNotifications(toArray<NotificationRow>(notificationsResult.data));
    if (overviewResult.error) {
      toast({ title: "Gouvernance Marketplace indisponible", description: overviewResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const loadHistory = async (caseId: string) => {
    const { data, error } = await db.from("my_marketplace_governance_case_history").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(80);
    if (error) {
      toast({ title: "Historique indisponible", description: error.message, variant: "destructive" });
      return;
    }
    setHistory(toArray<HistoryRow>(data));
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectCase = async (item: GovernanceCase) => {
    setSelectedCase(item);
    setStatus(item.status);
    setPriority(item.priority);
    setComment("");
    await loadHistory(item.id);
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

  const updateCase = async () => {
    if (!selectedCase) return;
    setIsWorking(true);
    const { error } = await db.rpc("update_marketplace_governance_case", {
      _case_id: selectedCase.id,
      _status: status,
      _priority: priority,
      _comment: comment || null,
      _final_decision: ["validated", "refused", "archived"].includes(status) ? comment || selectedCase.final_decision : null,
      _is_vendor_visible: selectedCase.is_vendor_visible,
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Mise a jour impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dossier mis a jour", description: "La decision reste historisee et explicable." });
    await loadData();
    await loadHistory(selectedCase.id);
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/60">
        <CardContent className="flex min-h-[240px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de la gouvernance Marketplace...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P3.1 Marketplace Governance & Automation</h2>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            File de decision humaine pour anomalies Marketplace. Le moteur ouvre des dossiers, explique et priorise, sans executer d'action sensible.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} className="border-gold/30">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
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
        <MetricCard label="En attente" value={overview?.waiting_cases || 0} icon={<Clock className="h-5 w-5" />} />
        <MetricCard label="Clotures" value={overview?.closed_cases || 0} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="border border-gold/20 bg-noir-light/60">
          <TabsTrigger value="queue">File de traitement</TabsTrigger>
          <TabsTrigger value="case">Dossier selectionne</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {openCases.length === 0 ? <EmptyState text="Aucun dossier ouvert. Lance le scan pour detecter les anomalies P2." /> : openCases.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/50">
              <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_220px_160px] md:items-center">
                <button type="button" onClick={() => selectCase(item)} className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cream">{item.case_number}</span>
                    <Badge variant={item.priority === "critical" ? "destructive" : "outline"}>{priorityLabel[item.priority]}</Badge>
                    <Badge variant="secondary">{statusLabel[item.status]}</Badge>
                  </div>
                  <div className="mt-2 font-medium text-cream">{item.problem}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.shop_name || "Marketplace"} {item.product_name ? `- ${item.product_name}` : ""}</div>
                </button>
                <div className="text-sm text-muted-foreground">
                  <div>Source : {item.source_module}</div>
                  <div>Confiance : {Number(item.confidence_score || 0).toFixed(0)}%</div>
                  <div>Historique : {item.history_count}</div>
                </div>
                <Button variant="outline" onClick={() => selectCase(item)} className="border-gold/30">
                  Examiner
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="case">
          {!selectedCase ? <EmptyState text="Selectionne un dossier dans la file de traitement." /> : (
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              <Card className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="text-cream">{selectedCase.case_number} - {selectedCase.case_type_label || selectedCase.case_type}</CardTitle>
                  <CardDescription>{selectedCase.problem}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{selectedCase.explanation}</p>
                  <InfoBlock title="Actions recommandees" value={selectedCase.recommended_actions} />
                  <InfoBlock title="Donnees utilisees" value={selectedCase.data_used} />
                  <InfoBlock title="Impacts potentiels" value={selectedCase.potential_impacts} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-muted-foreground">Statut</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="border-gold/20 bg-noir/60 text-cream"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Priorite</label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="border-gold/20 bg-noir/60 text-cream"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Commentaire ou decision finale..." className="min-h-28 border-gold/20 bg-noir/60 text-cream" />
                  <Button onClick={updateCase} disabled={isWorking} className="bg-gradient-gold text-noir">
                    {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Historiser la decision
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-gold/20 bg-noir/60">
                <CardHeader>
                  <CardTitle className="text-cream">Historique append-only</CardTitle>
                  <CardDescription>Aucune etape importante n'est ecrasee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {history.length === 0 ? <EmptyState text="Aucun historique." /> : history.map((row) => (
                    <div key={row.id} className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{row.action_type}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("fr-FR")}</span>
                      </div>
                      <div className="mt-2 text-sm text-cream">{row.comment || row.explanation || "Action historisee"}</div>
                      {(row.old_status || row.new_status) && <div className="mt-1 text-xs text-muted-foreground">{row.old_status || "-"} {"->"} {row.new_status || "-"}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>
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

function MetricInline({ label, value }: { label: string; value: number }) {
  return <div className="text-sm text-cream"><span className="text-muted-foreground">{label} : </span>{value}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-8 text-center text-muted-foreground">{text}</div>;
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
