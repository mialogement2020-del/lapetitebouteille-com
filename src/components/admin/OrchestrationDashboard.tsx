import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Plus, Play, Trash2, Workflow, Radio, History, Loader2 } from "lucide-react";

type DomainEvent = {
  id: number;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  error: string | null;
  occurred_at: string;
  processed_at: string | null;
  attempt_count?: number | null;
  next_attempt_at?: string | null;
  dead_letter_at?: string | null;
};

type WorkflowRule = {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  conditions: unknown;
  actions: unknown;
  is_active: boolean;
  priority: number;
  run_count: number;
  last_run_at: string | null;
};

type Execution = {
  id: number;
  rule_name: string | null;
  event_type: string | null;
  status: string;
  actions_run: number;
  error: string | null;
  duration_ms: number | null;
  executed_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground border-warning/30",
  processed: "bg-success/20 text-success border-success/30",
  success: "bg-success/20 text-success border-success/30",
  failed: "bg-destructive/20 text-destructive border-destructive/30",
  dead_letter: "bg-destructive text-destructive-foreground border-destructive",
  skipped: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  return <Badge className={STATUS_COLORS[status] ?? STATUS_COLORS.skipped}>{status}</Badge>;
}

export const OrchestrationDashboard = () => {
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_event: "order.created",
    conditions: "[]",
    actions: '[{"type":"notify_admins","params":{"title":"Alerte","message":"Événement détecté"}}]',
    priority: 100,
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, rRes, exRes] = await Promise.all([
      supabase.from("domain_events").select("*").order("id", { ascending: false }).limit(100),
      supabase.from("workflow_rules").select("*").order("priority", { ascending: true }),
      supabase.from("workflow_executions").select("*").order("id", { ascending: false }).limit(50),
    ]);
    if (evRes.data) setEvents(evRes.data as DomainEvent[]);
    if (rRes.data) setRules(rRes.data as WorkflowRule[]);
    if (exRes.data) setExecutions(exRes.data as Execution[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh on new events
  useEffect(() => {
    const ch = supabase
      .channel("orchestration-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "domain_events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_executions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const processPending = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("orchestrator-process", { body: {} });
      if (error) throw error;
      toast({ title: "Traitement terminé", description: `${data?.processed ?? 0} événement(s) traité(s).` });
      await load();
    } catch (e) {
      toast({ title: "Erreur", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const toggleRule = async (rule: WorkflowRule) => {
    const { error } = await supabase.from("workflow_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else load();
  };

  const deleteRule = async (rule: WorkflowRule) => {
    if (!confirm(`Supprimer la règle "${rule.name}" ?`)) return;
    const { error } = await supabase.from("workflow_rules").delete().eq("id", rule.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else load();
  };

  const saveRule = async () => {
    try {
      const conditions = JSON.parse(form.conditions);
      const actions = JSON.parse(form.actions);
      const { error } = await supabase.from("workflow_rules").insert({
        name: form.name,
        description: form.description || null,
        trigger_event: form.trigger_event,
        conditions,
        actions,
        priority: form.priority,
        is_active: form.is_active,
      });
      if (error) throw error;
      toast({ title: "Règle créée" });
      setDialogOpen(false);
      setForm({ ...form, name: "", description: "" });
      load();
    } catch (e) {
      toast({ title: "JSON invalide ou erreur", description: String((e as Error).message), variant: "destructive" });
    }
  };

  const pendingCount = events.filter((e) => e.status === "pending" || e.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display text-primary">Orchestration Layer</h2>
          <p className="text-sm text-muted-foreground">
            Event bus central · règles d'automatisation · audit des workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={processPending} disabled={processing || pendingCount === 0}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Traiter {pendingCount > 0 ? `(${pendingCount})` : ""}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>Événements (100 derniers)</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{events.length}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>En attente</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-warning">{pendingCount}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>Règles actives</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{rules.filter((r) => r.is_active).length}</div></CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-2"><CardDescription>Exécutions récentes</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-display text-primary">{executions.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="bg-noir/50 border border-gold/20">
          <TabsTrigger value="events"><Radio className="h-4 w-4 mr-2" />Flux d'événements</TabsTrigger>
          <TabsTrigger value="rules"><Workflow className="h-4 w-4 mr-2" />Règles</TabsTrigger>
          <TabsTrigger value="executions"><History className="h-4 w-4 mr-2" />Exécutions</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader>
              <CardTitle className="text-primary text-base">Événements de domaine</CardTitle>
              <CardDescription>Journal append-only · mises à jour en temps réel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-gold/10">
                    <th className="py-2 pr-3">Quand</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Agrégat</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 pr-3">Essais</th>
                    <th className="py-2 pr-3">Payload</th>
                  </tr></thead>
                  <tbody>
                    {events.length === 0 && !loading && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Aucun événement encore — passez une commande ou changez un statut pour voir le bus s'animer.</td></tr>
                    )}
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-gold/5 align-top">
                        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.occurred_at).toLocaleString("fr-FR")}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-primary">{e.event_type}</td>
                        <td className="py-2 pr-3 text-xs">{e.aggregate_type}<div className="text-muted-foreground truncate max-w-[140px]">{e.aggregate_id}</div></td>
                        <td className="py-2 pr-3"><StatusBadge status={e.status} /></td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{e.attempt_count ?? 0}</td>
                        <td className="py-2 pr-3 max-w-md"><code className="text-xs text-muted-foreground break-all">{JSON.stringify(e.payload).slice(0, 160)}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-primary text-base">Workflow Automation</CardTitle>
                <CardDescription>Règles qui réagissent automatiquement aux événements</CardDescription>
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouvelle règle</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {rules.map((r) => (
                <div key={r.id} className="border border-gold/10 rounded-lg p-3 bg-noir/30">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{r.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">{r.trigger_event}</Badge>
                        <Badge variant="outline" className="text-xs">priorité {r.priority}</Badge>
                        {r.run_count > 0 && <Badge variant="outline" className="text-xs">{r.run_count} exécutions</Badge>}
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                      <details className="mt-2"><summary className="text-xs text-muted-foreground cursor-pointer">Voir conditions / actions</summary>
                        <pre className="text-xs mt-1 bg-noir/50 p-2 rounded overflow-x-auto"><code>conditions: {JSON.stringify(r.conditions, null, 2)}{"\n"}actions: {JSON.stringify(r.actions, null, 2)}</code></pre>
                      </details>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r)} />
                      <Button size="icon" variant="ghost" onClick={() => deleteRule(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune règle.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader>
              <CardTitle className="text-primary text-base">Historique des exécutions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b border-gold/10">
                    <th className="py-2 pr-3">Quand</th>
                    <th className="py-2 pr-3">Règle</th>
                    <th className="py-2 pr-3">Événement</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 pr-3">Actions</th>
                    <th className="py-2 pr-3">Durée</th>
                  </tr></thead>
                  <tbody>
                    {executions.map((x) => (
                      <tr key={x.id} className="border-b border-gold/5">
                        <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(x.executed_at).toLocaleString("fr-FR")}</td>
                        <td className="py-2 pr-3">{x.rule_name}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{x.event_type}</td>
                        <td className="py-2 pr-3"><StatusBadge status={x.status} /></td>
                        <td className="py-2 pr-3">{x.actions_run}</td>
                        <td className="py-2 pr-3 text-muted-foreground text-xs">{x.duration_ms ?? "—"} ms</td>
                      </tr>
                    ))}
                    {executions.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Aucune exécution.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouvelle règle d'automatisation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Événement déclencheur</Label>
              <Input
                value={form.trigger_event}
                onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                placeholder="order.created, order.status_changed, commission.created, withdrawal.requested..."
              />
            </div>
            <div>
              <Label>Conditions (JSON)</Label>
              <Textarea rows={4} className="font-mono text-xs" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Ex: <code>{`[{"path":"payload.total","op":"gte","value":50000}]`}</code> · ops: eq, neq, gte, lte, gt, lt, in, exists</p>
            </div>
            <div>
              <Label>Actions (JSON)</Label>
              <Textarea rows={5} className="font-mono text-xs" value={form.actions} onChange={(e) => setForm({ ...form, actions: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Types: <code>notify_admins</code>, <code>notify_user</code>, <code>log</code></p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1"><Label>Priorité</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveRule} disabled={!form.name}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrchestrationDashboard;
