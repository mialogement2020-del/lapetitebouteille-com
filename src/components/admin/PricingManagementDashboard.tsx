import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Play, RotateCcw, History, Percent, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useFormatPrice } from "@/hooks/useFormatPrice";

type Scope = "global" | "category" | "brand" | "supplier" | "product";

interface MarginRule {
  id: string;
  scope: Scope;
  scope_id: string | null;
  margin_retail_percent: number;
  margin_wholesale_percent: number | null;
  priority: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  scope: Scope;
  scope_id: string | null;
  old_margin_retail: number | null;
  new_margin_retail: number | null;
  affected_count: number | null;
  total_impact: number | null;
  reason: string | null;
  created_at: string;
  actor_id: string | null;
}

const RULES_TABLE = "pricing_margin_rules" as never;
const HISTORY_TABLE = "pricing_history" as never;

function MarginRulesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    scope: "global" as Scope,
    scope_id: "",
    margin_retail_percent: 30,
    margin_wholesale_percent: 15,
    notes: "",
  });

  const rulesQuery = useQuery({
    queryKey: ["pricing-margin-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(RULES_TABLE)
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarginRule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        scope: form.scope,
        scope_id: form.scope === "global" ? null : form.scope_id || null,
        margin_retail_percent: form.margin_retail_percent,
        margin_wholesale_percent: form.margin_wholesale_percent,
        notes: form.notes || null,
        is_active: true,
      };
      const { error } = await supabase.from(RULES_TABLE).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Règle créée" });
      qc.invalidateQueries({ queryKey: ["pricing-margin-rules"] });
      setForm({ ...form, scope_id: "", notes: "" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from(RULES_TABLE).update({ is_active } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-margin-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(RULES_TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Règle supprimée" });
      qc.invalidateQueries({ queryKey: ["pricing-margin-rules"] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (rule: MarginRule) => {
      const { data, error } = await supabase.rpc("apply_margin_change" as never, {
        _rule: {
          scope: rule.scope,
          scope_id: rule.scope_id,
          margin_retail_percent: rule.margin_retail_percent,
          margin_wholesale_percent: rule.margin_wholesale_percent,
        },
        _reason: `Application manuelle règle ${rule.id.slice(0, 8)}`,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Recalcul appliqué", description: "Les prix ont été mis à jour." });
      qc.invalidateQueries({ queryKey: ["pricing-history"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Nouvelle règle de marge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Portée</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as Scope })}>
                <SelectTrigger className="bg-cream/5 border-gold/20 text-cream"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="category">Catégorie</SelectItem>
                  <SelectItem value="brand">Marque</SelectItem>
                  <SelectItem value="supplier">Fournisseur</SelectItem>
                  <SelectItem value="product">Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">ID cible (UUID)</Label>
              <Input
                disabled={form.scope === "global"}
                value={form.scope_id}
                onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                placeholder={form.scope === "global" ? "N/A" : "UUID"}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Marge détail %</Label>
              <Input
                type="number"
                step="0.1"
                value={form.margin_retail_percent}
                onChange={(e) => setForm({ ...form, margin_retail_percent: Number(e.target.value) })}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Marge gros %</Label>
              <Input
                type="number"
                step="0.1"
                value={form.margin_wholesale_percent}
                onChange={(e) => setForm({ ...form, margin_wholesale_percent: Number(e.target.value) })}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1 flex items-end">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full bg-gradient-gold text-noir font-semibold"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
          <Textarea
            placeholder="Notes (optionnel)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="bg-cream/5 border-gold/20 text-cream"
          />
        </CardContent>
      </Card>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">Règles actives (par priorité)</CardTitle>
        </CardHeader>
        <CardContent>
          {rulesQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className="space-y-2">
              {(rulesQuery.data || []).map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg bg-cream/5 border border-gold/10">
                  <Badge variant="outline" className="border-gold/30 text-cream">{rule.scope}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream text-sm truncate">
                      Détail: <span className="text-primary font-semibold">{rule.margin_retail_percent}%</span>
                      {rule.margin_wholesale_percent != null && (
                        <> · Gros: <span className="text-primary font-semibold">{rule.margin_wholesale_percent}%</span></>
                      )}
                      {rule.scope_id && <span className="text-cream/50 ml-2 text-xs">{rule.scope_id.slice(0, 8)}…</span>}
                    </p>
                    {rule.notes && <p className="text-cream/50 text-xs">{rule.notes}</p>}
                  </div>
                  <Badge className="bg-cream/10 text-cream">P{rule.priority}</Badge>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, is_active: v })}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyMutation.mutate(rule)}
                    disabled={applyMutation.isPending}
                    className="bg-transparent border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Play className="h-3 w-3 mr-1" /> Appliquer
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(rulesQuery.data || []).length === 0 && (
                <p className="text-cream/50 text-sm text-center py-6">Aucune règle configurée</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SimulationResult {
  affected_count?: number;
  total_impact?: number;
  sample?: Array<{ product_id: string; name: string; old_price: number; new_price: number }>;
}

function SimulationTab() {
  const formatPrice = useFormatPrice();
  const [form, setForm] = useState({
    scope: "global" as Scope,
    scope_id: "",
    margin_retail_percent: 35,
    margin_wholesale_percent: 18,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("simulate_margin_change" as never, {
        _rule: {
          scope: form.scope,
          scope_id: form.scope === "global" ? null : form.scope_id || null,
          margin_retail_percent: form.margin_retail_percent,
          margin_wholesale_percent: form.margin_wholesale_percent,
        },
      } as never);
      if (error) throw error;
      return data as SimulationResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Simulation terminée", description: `${data?.affected_count ?? 0} produit(s) impactés` });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" /> Simulation (aucune écriture)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Portée</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as Scope })}>
                <SelectTrigger className="bg-cream/5 border-gold/20 text-cream"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="category">Catégorie</SelectItem>
                  <SelectItem value="brand">Marque</SelectItem>
                  <SelectItem value="supplier">Fournisseur</SelectItem>
                  <SelectItem value="product">Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">ID cible</Label>
              <Input
                disabled={form.scope === "global"}
                value={form.scope_id}
                onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Marge détail %</Label>
              <Input
                type="number"
                step="0.1"
                value={form.margin_retail_percent}
                onChange={(e) => setForm({ ...form, margin_retail_percent: Number(e.target.value) })}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Marge gros %</Label>
              <Input
                type="number"
                step="0.1"
                value={form.margin_wholesale_percent}
                onChange={(e) => setForm({ ...form, margin_wholesale_percent: Number(e.target.value) })}
                className="bg-cream/5 border-gold/20 text-cream"
              />
            </div>
            <div className="space-y-1 flex items-end">
              <Button
                onClick={() => simulateMutation.mutate()}
                disabled={simulateMutation.isPending}
                className="w-full bg-gradient-gold text-noir font-semibold"
              >
                {simulateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Simuler
              </Button>
            </div>
          </div>

          {result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-cream/60 text-xs">Produits impactés</p>
                <p className="text-primary font-bold text-2xl">{result.affected_count ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg bg-cream/5 border border-gold/10">
                <p className="text-cream/60 text-xs">Impact total (CA estimé)</p>
                <p className="text-cream font-bold text-2xl">{formatPrice(Number(result.total_impact ?? 0))}</p>
              </div>
            </div>
          )}

          {result?.sample && result.sample.length > 0 && (
            <div className="space-y-1">
              <Label className="text-cream/70 text-xs">Échantillon</Label>
              <div className="space-y-1 max-h-72 overflow-auto">
                {result.sample.map((s) => (
                  <div key={s.product_id} className="flex items-center justify-between p-2 rounded bg-cream/5 border border-gold/10 text-sm">
                    <span className="text-cream truncate flex-1">{s.name}</span>
                    <span className="text-cream/60 mx-2">{formatPrice(s.old_price)}</span>
                    <span className="text-primary font-semibold">→ {formatPrice(s.new_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTab() {
  const qc = useQueryClient();
  const formatPrice = useFormatPrice();

  const historyQuery = useQuery({
    queryKey: ["pricing-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(HISTORY_TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as HistoryEntry[];
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("rollback_pricing_change" as never, { _history_id: id } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rollback effectué" });
      qc.invalidateQueries({ queryKey: ["pricing-history"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Historique des modifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="space-y-2">
            {(historyQuery.data || []).map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-cream/5 border border-gold/10">
                <Badge variant="outline" className="border-gold/30 text-cream">{h.action}</Badge>
                <Badge className="bg-cream/10 text-cream">{h.scope}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-cream text-sm">
                    {h.old_margin_retail != null && (
                      <>Marge: {h.old_margin_retail}% → <span className="text-primary font-semibold">{h.new_margin_retail}%</span></>
                    )}
                    {h.affected_count != null && (
                      <span className="text-cream/60 ml-2">({h.affected_count} produits)</span>
                    )}
                  </p>
                  <p className="text-cream/50 text-xs">
                    {new Date(h.created_at).toLocaleString("fr-FR")}
                    {h.reason && ` · ${h.reason}`}
                  </p>
                </div>
                {h.total_impact != null && (
                  <span className="text-cream/70 text-sm">{formatPrice(Number(h.total_impact))}</span>
                )}
                {h.action !== "rollback" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rollbackMutation.mutate(h.id)}
                    disabled={rollbackMutation.isPending}
                    className="bg-transparent border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Annuler
                  </Button>
                )}
              </div>
            ))}
            {(historyQuery.data || []).length === 0 && (
              <p className="text-cream/50 text-sm text-center py-6">Aucune modification enregistrée</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PricingManagementDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Percent className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-cream">Pricing Management (P4.5.1)</h2>
      </div>
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="bg-noir/50 border border-gold/20">
          <TabsTrigger value="rules">Règles de marge</TabsTrigger>
          <TabsTrigger value="simulation">Simulation</TabsTrigger>
          <TabsTrigger value="history">Historique & Rollback</TabsTrigger>
        </TabsList>
        <TabsContent value="rules"><MarginRulesTab /></TabsContent>
        <TabsContent value="simulation"><SimulationTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

export default PricingManagementDashboard;