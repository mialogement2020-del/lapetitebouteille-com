import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Send, Plus, Users, TrendingUp, Loader2 } from "lucide-react";

const SEGMENTS: { id: string; label: string; color: string }[] = [
  { id: "champions", label: "Champions", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  { id: "loyal", label: "Loyaux", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { id: "promising", label: "Prometteurs", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  { id: "new", label: "Nouveaux", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" },
  { id: "regular", label: "Réguliers", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
  { id: "at_risk", label: "À risque", color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  { id: "hibernating", label: "Hibernation", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  { id: "lost", label: "Perdus", color: "bg-red-500/20 text-red-400 border-red-500/40" },
];

interface SegmentRow {
  segment: string;
  count: number;
  revenue: number;
  avg_recency: number;
  avg_frequency: number;
}

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  target_segment: string;
  channel: string;
  subject: string | null;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

export function RetentionDashboard() {
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [segRes, campRes] = await Promise.all([
      supabase.from("customer_segments").select("segment,monetary,recency_days,frequency"),
      supabase.from("retention_campaigns").select("*").order("created_at", { ascending: false }),
    ]);

    if (segRes.data) {
      const grouped = new Map<string, SegmentRow>();
      for (const row of segRes.data as any[]) {
        const s = row.segment || "regular";
        const cur = grouped.get(s) || { segment: s, count: 0, revenue: 0, avg_recency: 0, avg_frequency: 0 };
        cur.count += 1;
        cur.revenue += Number(row.monetary || 0);
        cur.avg_recency += Number(row.recency_days || 0);
        cur.avg_frequency += Number(row.frequency || 0);
        grouped.set(s, cur);
      }
      const arr = Array.from(grouped.values()).map((r) => ({
        ...r,
        avg_recency: r.count ? Math.round(r.avg_recency / r.count) : 0,
        avg_frequency: r.count ? Math.round((r.avg_frequency / r.count) * 10) / 10 : 0,
      }));
      setSegments(arr);
    }
    if (campRes.data) setCampaigns(campRes.data as Campaign[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    const { data, error } = await supabase.rpc("recompute_customer_segments");
    setRecomputing(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Segments recalculés", description: `${data} clients segmentés` });
    fetchAll();
  };

  const saveCampaign = async () => {
    if (!editing?.name || !editing?.message || !editing?.target_segment) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description || null,
      target_segment: editing.target_segment,
      channel: editing.channel || "notification",
      subject: editing.subject || null,
      message: editing.message,
      cta_label: editing.cta_label || null,
      cta_url: editing.cta_url || null,
      is_active: editing.is_active ?? true,
    };
    const res = editing.id
      ? await supabase.from("retention_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("retention_campaigns").insert(payload);
    if (res.error) {
      toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Campagne mise à jour" : "Campagne créée" });
    setDialogOpen(false);
    setEditing(null);
    fetchAll();
  };

  const toggleCampaign = async (c: Campaign) => {
    await supabase.from("retention_campaigns").update({ is_active: !c.is_active }).eq("id", c.id);
    fetchAll();
  };

  const runCampaign = async (c: Campaign) => {
    setSending(c.id);
    try {
      // Fetch users in target segment
      const { data: users, error } = await supabase
        .from("customer_segments")
        .select("user_id")
        .eq("segment", c.target_segment);
      if (error) throw error;
      const recipients = users || [];
      if (recipients.length === 0) {
        toast({ title: "Aucun destinataire dans ce segment" });
        return;
      }
      // Insert notifications for each recipient
      const notifPayloads = recipients.map((u) => ({
        user_id: u.user_id,
        title: c.subject || c.name,
        message: c.message,
        type: "campaign",
        link: c.cta_url || null,
      }));
      const { error: nErr } = await supabase.from("user_notifications").insert(notifPayloads);
      if (nErr) throw nErr;

      const deliveries = recipients.map((u) => ({
        campaign_id: c.id,
        user_id: u.user_id,
        channel: c.channel,
        status: "sent",
      }));
      await supabase.from("campaign_deliveries").insert(deliveries);
      await supabase.from("retention_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", c.id);

      toast({ title: "Campagne envoyée", description: `${recipients.length} destinataires` });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Erreur d'envoi", description: e.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const totals = useMemo(() => {
    const totalCustomers = segments.reduce((s, x) => s + x.count, 0);
    const totalRevenue = segments.reduce((s, x) => s + x.revenue, 0);
    const atRisk = segments.filter((s) => ["at_risk", "hibernating", "lost"].includes(s.segment)).reduce((s, x) => s + x.count, 0);
    return { totalCustomers, totalRevenue, atRisk };
  }, [segments]);

  const fmt = new Intl.NumberFormat("fr-FR");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display text-cream">Fidélisation & Retention</h2>
          <p className="text-cream/60 text-sm">Segmentation RFM et campagnes ciblées</p>
        </div>
        <Button onClick={recompute} disabled={recomputing} variant="outline" className="border-gold/30">
          {recomputing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Recalculer les segments
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-noir/50 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-xs text-cream/60">Clients segmentés</p>
                <p className="text-2xl font-bold text-cream">{fmt.format(totals.totalCustomers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-xs text-cream/60">CA total segmenté</p>
                <p className="text-2xl font-bold text-cream">{fmt.format(Math.round(totals.totalRevenue))} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-noir/50 border-gold/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-xs text-cream/60">À risque / perdus</p>
                <p className="text-2xl font-bold text-cream">{fmt.format(totals.atRisk)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="segments">
        <TabsList className="bg-noir/50 border border-gold/20">
          <TabsTrigger value="segments">Segments RFM</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="mt-4">
          <Card className="bg-noir/50 border-gold/20">
            <CardHeader>
              <CardTitle className="text-cream text-lg">Répartition par segment</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-cream/60">Chargement…</p>
              ) : segments.length === 0 ? (
                <p className="text-cream/60">Aucun segment. Lance « Recalculer » pour générer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead className="text-right">Clients</TableHead>
                      <TableHead className="text-right">CA cumulé</TableHead>
                      <TableHead className="text-right">Récence moy.</TableHead>
                      <TableHead className="text-right">Fréquence moy.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SEGMENTS.map((s) => {
                      const row = segments.find((x) => x.segment === s.id);
                      if (!row) return null;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Badge variant="outline" className={s.color}>{s.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-cream">{fmt.format(row.count)}</TableCell>
                          <TableCell className="text-right text-cream">{fmt.format(Math.round(row.revenue))} FCFA</TableCell>
                          <TableCell className="text-right text-cream/70">{row.avg_recency} j</TableCell>
                          <TableCell className="text-right text-cream/70">{row.avg_frequency}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing({ channel: "notification", target_segment: "at_risk", is_active: true })} className="bg-primary text-noir">
                  <Plus className="h-4 w-4 mr-2" /> Nouvelle campagne
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-noir border-gold/30 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-cream">{editing?.id ? "Modifier" : "Nouvelle"} campagne</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-cream/70">Nom</Label>
                    <Input value={editing?.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-cream/70">Segment cible</Label>
                      <Select value={editing?.target_segment} onValueChange={(v) => setEditing({ ...editing, target_segment: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SEGMENTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-cream/70">Canal</Label>
                      <Select value={editing?.channel} onValueChange={(v) => setEditing({ ...editing, channel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">Notification in-app</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-cream/70">Sujet / titre</Label>
                    <Input value={editing?.subject || ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-cream/70">Message</Label>
                    <Textarea rows={4} value={editing?.message || ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-cream/70">CTA label</Label>
                      <Input value={editing?.cta_label || ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-cream/70">CTA URL</Label>
                      <Input value={editing?.cta_url || ""} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                    <Label className="text-cream/70">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button onClick={saveCampaign} className="bg-primary text-noir">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="bg-noir/50 border-gold/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Dernier envoi</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-cream/60 py-6">Aucune campagne. Crée-en une pour ré-engager tes clients.</TableCell></TableRow>
                  )}
                  {campaigns.map((c) => {
                    const seg = SEGMENTS.find((s) => s.id === c.target_segment);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-cream cursor-pointer" onClick={() => { setEditing(c); setDialogOpen(true); }}>{c.name}</TableCell>
                        <TableCell><Badge variant="outline" className={seg?.color}>{seg?.label || c.target_segment}</Badge></TableCell>
                        <TableCell className="text-cream/70">{c.channel}</TableCell>
                        <TableCell className="text-cream/60 text-xs">{c.last_run_at ? new Date(c.last_run_at).toLocaleString("fr-FR") : "—"}</TableCell>
                        <TableCell><Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" disabled={!c.is_active || sending === c.id} onClick={() => runCampaign(c)}>
                            {sending === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            Envoyer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RetentionDashboard;