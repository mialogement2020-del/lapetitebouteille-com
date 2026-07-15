import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Archive,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type OpportunityEvent = {
  id: string;
  name: string;
  slug: string;
  event_type: string;
  status: string;
  priority: string;
  category: string;
  description: string | null;
  commercial_objective: string | null;
  starts_at: string;
  ends_at: string;
  recommended_actions: string[] | unknown;
  target_client_types: string[];
  target_cities: string[];
  target_regions: string[];
  marketing_asset_requirements: unknown;
  ai_brief: Record<string, unknown> | null;
  recommended_products: RecommendedProduct[] | unknown;
  recommended_categories: RecommendedCategory[] | unknown;
  missions: MissionPreview[] | unknown;
};

type AdminOpportunityReport = {
  id: string;
  name: string;
  slug: string;
  event_type: string;
  status: string;
  is_active: boolean;
  priority: string;
  category: string;
  starts_at: string;
  ends_at: string;
  recommended_product_count: number;
  recommended_category_count: number;
  campaign_count: number;
  mission_count: number;
  marketing_asset_count: number;
};

type MissionBoardItem = {
  id: string;
  event_id: string | null;
  event_name: string | null;
  title: string;
  description: string | null;
  mission_type: string;
  priority: string;
  status: string;
  due_at: string | null;
  suggested_client_types: string[];
  suggested_cities: string[];
};

type RecommendedProduct = {
  product_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  price: number | null;
  relevance_score: number | null;
  rationale: string | null;
};

type RecommendedCategory = {
  category_id: string;
  name: string;
  slug: string | null;
  relevance_score: number | null;
  rationale: string | null;
};

type MissionPreview = {
  mission_id: string;
  title: string;
  mission_type: string;
  priority: string;
  due_at: string | null;
  status: string;
};

type NewEventForm = {
  name: string;
  slug: string;
  event_type: string;
  priority: string;
  category: string;
  starts_at: string;
  ends_at: string;
  description: string;
  commercial_objective: string;
  target_client_types: string;
  target_cities: string;
  recommended_actions: string;
};

const db = supabase as any;

const emptyForm: NewEventForm = {
  name: "",
  slug: "",
  event_type: "custom",
  priority: "medium",
  category: "general",
  starts_at: "",
  ends_at: "",
  description: "",
  commercial_objective: "",
  target_client_types: "individual, loyal",
  target_cities: "Yaoundé, Douala",
  recommended_actions: "",
};

const priorityLabels: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

const priorityStyles: Record<string, string> = {
  low: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  critical: "border-red-500/30 bg-red-500/10 text-red-200",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Planifiée",
  active: "Active",
  paused: "En pause",
  archived: "Archivée",
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Non planifié";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFcfa = (value: number | null | undefined) =>
  `${Math.round(Number(value || 0)).toLocaleString("fr-FR")} FCFA`;

const asArray = <T,>(value: T[] | unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const eventInRange = (event: OpportunityEvent, start: Date, end: Date) => {
  const eventStart = new Date(event.starts_at).getTime();
  const eventEnd = new Date(event.ends_at).getTime();
  return eventStart <= end.getTime() && eventEnd >= start.getTime();
};

export default function CommercialOpportunityCalendar() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<OpportunityEvent[]>([]);
  const [adminReport, setAdminReport] = useState<AdminOpportunityReport[]>([]);
  const [missions, setMissions] = useState<MissionBoardItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<OpportunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("week");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [form, setForm] = useState<NewEventForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    const [eventsRes, reportRes, missionsRes] = await Promise.all([
      db.from("advisor_commercial_opportunity_calendar").select("*").order("starts_at", { ascending: true }).limit(120),
      db.from("admin_commercial_opportunity_calendar_report").select("*").order("starts_at", { ascending: true }).limit(200),
      db.from("advisor_commercial_mission_board").select("*").order("due_at", { ascending: true }).limit(120),
    ]);

    if (eventsRes.error) {
      toast({
        title: "Calendrier IA non disponible",
        description: eventsRes.error.message,
        variant: "destructive",
      });
    } else {
      setEvents((eventsRes.data || []) as OpportunityEvent[]);
      setSelectedEvent((eventsRes.data?.[0] as OpportunityEvent | undefined) || null);
    }

    if (!reportRes.error) setAdminReport((reportRes.data || []) as AdminOpportunityReport[]);
    if (!missionsRes.error) setMissions((missionsRes.data || []) as MissionBoardItem[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const endWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const end = period === "today" ? endToday : period === "month" ? endMonth : endWeek;
    return events.filter((event) => {
      const inPeriod = eventInRange(event, startToday, end);
      if (!inPeriod) return false;
      if (!normalized) return true;
      return [event.name, event.category, event.description, event.commercial_objective]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [events, query, period, startToday, endToday, endWeek, endMonth]);

  const todayCount = events.filter((event) => eventInRange(event, startToday, endToday)).length;
  const weekCount = events.filter((event) => eventInRange(event, startToday, endWeek)).length;
  const monthCount = events.filter((event) => eventInRange(event, startToday, endMonth)).length;
  const activeCampaigns = adminReport.filter((event) => event.status === "active" || event.status === "scheduled").length;

  const createEvent = async () => {
    if (!form.name.trim() || !form.starts_at || !form.ends_at) {
      toast({ title: "Informations manquantes", description: "Nom, date de début et date de fin sont obligatoires.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const slug = form.slug.trim() || slugify(form.name);
    const { error } = await db.from("commercial_opportunity_events").insert({
      name: form.name.trim(),
      slug,
      event_type: form.event_type,
      status: "scheduled",
      is_active: true,
      priority: form.priority,
      category: form.category.trim() || "general",
      description: form.description.trim() || null,
      commercial_objective: form.commercial_objective.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      target_client_types: splitList(form.target_client_types),
      target_cities: splitList(form.target_cities),
      recommended_actions: splitList(form.recommended_actions),
      ai_brief: {
        source: "admin_manual_creation",
        future_modules: ["daily_ai_goals", "coach_ai", "crm", "campaigns"],
      },
      created_by: user?.id,
      updated_by: user?.id,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Création impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Opportunité commerciale créée" });
    setForm(emptyForm);
    setEventDialogOpen(false);
    void load();
  };

  const toggleEvent = async (row: AdminOpportunityReport, isActive: boolean) => {
    const { error } = await db.rpc("commercial_calendar_toggle_event", {
      _event_id: row.id,
      _is_active: isActive,
      _reason: isActive ? "Réactivation depuis le calendrier IA" : "Pause depuis le calendrier IA",
    });
    if (error) {
      toast({ title: "Action impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isActive ? "Opportunité activée" : "Opportunité mise en pause" });
    void load();
  };

  const archiveEvent = async (row: AdminOpportunityReport) => {
    const { error } = await db.rpc("commercial_calendar_archive_event", {
      _event_id: row.id,
      _reason: "Archivage depuis le calendrier IA",
    });
    if (error) {
      toast({ title: "Archivage impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunité archivée" });
    void load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-gold/20 bg-noir/50 text-cream">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Chargement du calendrier IA...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">P1.2 Calendrier IA des Opportunités</h2>
          <p className="text-sm text-muted-foreground">
            Moteur commercial pour vendre au bon moment, sans mouvement financier ni modification du P0.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setEventDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle opportunité
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={CalendarDays} label="Aujourd'hui" value={todayCount} />
        <KpiCard icon={Clock} label="Cette semaine" value={weekCount} tone="warning" />
        <KpiCard icon={Target} label="Ce mois" value={monthCount} tone="success" />
        <KpiCard icon={BriefcaseBusiness} label="Campagnes actives" value={activeCampaigns} />
      </div>

      <Card className="border-gold/20 bg-noir/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />
            Intelligence commerciale
          </CardTitle>
          <CardDescription>
            Les opportunités alimenteront plus tard Objectifs IA, Coach IA, CRM, générateurs de messages et campagnes WhatsApp/Email.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Insight label="Ciblage" value="Clients, villes, régions, vendeurs et partenaires" />
          <Insight label="Recommandations" value="Produits, catégories, actions et supports marketing" />
          <Insight label="Sécurité P0" value="Lecture commerciale uniquement, aucun wallet ni commission" />
        </CardContent>
      </Card>

      <Tabs defaultValue="advisor">
        <TabsList>
          <TabsTrigger value="advisor">Conseiller</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="advisor" className="space-y-5 pt-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une opportunité..." />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="border-gold/20 bg-noir/50">
              <CardHeader>
                <CardTitle className="text-primary">Opportunités commerciales</CardTitle>
                <CardDescription>Priorité, période, clients ciblés et action conseillée.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={`w-full rounded-lg border p-4 text-left transition hover:bg-cream/5 ${
                      selectedEvent?.id === event.id ? "border-gold bg-gold/10" : "border-gold/10 bg-noir/30"
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-cream">{event.name}</h3>
                          <Badge className={priorityStyles[event.priority] || priorityStyles.medium}>{priorityLabels[event.priority] || event.priority}</Badge>
                          <Badge variant="outline">{event.category}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{event.description || "Description à compléter par l'admin."}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {formatDate(event.starts_at)}
                        <br />
                        {formatDate(event.ends_at)}
                      </div>
                    </div>
                  </button>
                ))}
                {visibleEvents.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gold/20 p-8 text-center text-sm text-muted-foreground">
                    Aucune opportunité sur cette période.
                  </p>
                )}
              </CardContent>
            </Card>

            <EventDetail event={selectedEvent} />
          </div>
        </TabsContent>

        <TabsContent value="missions" className="space-y-4 pt-4">
          <Card className="border-gold/20 bg-noir/50">
            <CardHeader>
              <CardTitle className="text-primary">Missions disponibles</CardTitle>
              <CardDescription>Actions prêtes à être utilisées par les conseillers LPB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {missions.map((mission) => (
                <div key={mission.id} className="rounded-lg border border-gold/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-cream">{mission.title}</p>
                      <p className="text-sm text-muted-foreground">{mission.description || mission.event_name || "Mission commerciale LPB"}</p>
                    </div>
                    <Badge className={priorityStyles[mission.priority] || priorityStyles.medium}>{priorityLabels[mission.priority] || mission.priority}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Tag icon={Target} label={mission.mission_type} />
                    <Tag icon={MapPin} label={mission.suggested_cities.join(", ") || "Toutes villes"} />
                    <Tag icon={Clock} label={mission.due_at ? formatDate(mission.due_at) : "Sans échéance"} />
                  </div>
                </div>
              ))}
              {missions.length === 0 && <p className="text-sm text-muted-foreground">Aucune mission active pour le moment.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4 pt-4">
          <Card className="border-gold/20 bg-noir/50">
            <CardHeader>
              <CardTitle className="text-primary">Pilotage admin</CardTitle>
              <CardDescription>Création, activation, désactivation et archivage des campagnes commerciales.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gold/10 text-left text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3">Opportunité</th>
                    <th className="py-3 pr-3">Statut</th>
                    <th className="py-3 pr-3">Associations</th>
                    <th className="py-3 pr-3">Période</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminReport.map((row) => (
                    <tr key={row.id} className="border-b border-gold/5">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-cream">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.category} · {row.event_type}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline">{statusLabels[row.status] || row.status}</Badge>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {row.recommended_product_count} produits · {row.recommended_category_count} catégories · {row.mission_count} missions
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {formatDate(row.starts_at)} → {formatDate(row.ends_at)}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          {row.is_active ? (
                            <Button variant="outline" size="sm" onClick={() => toggleEvent(row, false)}>
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => toggleEvent(row, true)}>
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => archiveEvent(row)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminReport.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun rapport admin disponible.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-3xl border-gold/20 bg-noir text-cream">
          <DialogHeader>
            <DialogTitle className="text-primary">Nouvelle opportunité commerciale</DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
            <Field label="Nom">
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value, slug: prev.slug || slugify(event.target.value) }))} />
            </Field>
            <Field label="Slug">
              <Input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} />
            </Field>
            <Field label="Type">
              <Select value={form.event_type} onValueChange={(value) => setForm((prev) => ({ ...prev, event_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seasonal">Saisonnier</SelectItem>
                  <SelectItem value="life_event">Événement de vie</SelectItem>
                  <SelectItem value="company">Entreprise</SelectItem>
                  <SelectItem value="product_launch">Lancement produit</SelectItem>
                  <SelectItem value="lpb_promotion">Promotion LPB</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priorité">
              <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Catégorie commerciale">
              <Input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
            </Field>
            <Field label="Clients ciblés">
              <Input value={form.target_client_types} onChange={(event) => setForm((prev) => ({ ...prev, target_client_types: event.target.value }))} placeholder="vip, company, gift" />
            </Field>
            <Field label="Début">
              <Input type="datetime-local" value={form.starts_at} onChange={(event) => setForm((prev) => ({ ...prev, starts_at: event.target.value }))} />
            </Field>
            <Field label="Fin">
              <Input type="datetime-local" value={form.ends_at} onChange={(event) => setForm((prev) => ({ ...prev, ends_at: event.target.value }))} />
            </Field>
            <Field label="Villes ciblées">
              <Input value={form.target_cities} onChange={(event) => setForm((prev) => ({ ...prev, target_cities: event.target.value }))} />
            </Field>
            <Field label="Actions conseillées">
              <Input value={form.recommended_actions} onChange={(event) => setForm((prev) => ({ ...prev, recommended_actions: event.target.value }))} placeholder="Relancer VIP, préparer devis..." />
            </Field>
            <div className="md:col-span-2">
              <Field label="Objectif commercial">
                <Textarea value={form.commercial_objective} onChange={(event) => setForm((prev) => ({ ...prev, commercial_objective: event.target.value }))} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Annuler</Button>
            <Button onClick={createEvent} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventDetail({ event }: { event: OpportunityEvent | null }) {
  if (!event) {
    return (
      <Card className="border-gold/20 bg-noir/50">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Sélectionne une opportunité pour voir les recommandations.
        </CardContent>
      </Card>
    );
  }

  const products = asArray<RecommendedProduct>(event.recommended_products);
  const categories = asArray<RecommendedCategory>(event.recommended_categories);
  const missions = asArray<MissionPreview>(event.missions);
  const actions = asArray<string>(event.recommended_actions);

  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader>
        <CardTitle className="text-primary">{event.name}</CardTitle>
        <CardDescription>{event.commercial_objective || "Objectif commercial à préciser."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 text-sm">
          <InfoLine icon={CalendarDays} label="Période" value={`${formatDate(event.starts_at)} → ${formatDate(event.ends_at)}`} />
          <InfoLine icon={Users} label="Clients ciblés" value={event.target_client_types.join(", ") || "Tous clients"} />
          <InfoLine icon={MapPin} label="Villes" value={event.target_cities.join(", ") || "Toutes villes"} />
        </div>

        <Section title="Actions conseillées" icon={Sparkles}>
          {actions.length > 0 ? actions.map((action) => <Bullet key={action} label={action} />) : <Empty label="Aucune action définie." />}
        </Section>

        <Section title="Produits recommandés" icon={Package}>
          {products.slice(0, 5).map((product) => (
            <div key={product.product_id} className="flex items-center justify-between gap-3 rounded-lg border border-gold/10 p-3">
              <div>
                <p className="font-medium text-cream">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.rationale || "Recommandation commerciale"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary">{formatFcfa(product.price)}</p>
                <p className="text-xs text-muted-foreground">{product.relevance_score ?? 0}%</p>
              </div>
            </div>
          ))}
          {products.length === 0 && <Empty label="Associer des produits depuis l'admin." />}
        </Section>

        <Section title="Catégories concernées" icon={Target}>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category.category_id} variant="outline">{category.name}</Badge>
            ))}
            {categories.length === 0 && <Empty label="Associer des catégories depuis l'admin." />}
          </div>
        </Section>

        <Section title="Missions proposées" icon={CheckCircle2}>
          {missions.slice(0, 4).map((mission) => (
            <div key={mission.mission_id} className="rounded-lg border border-gold/10 p-3">
              <p className="font-medium text-cream">{mission.title}</p>
              <p className="text-xs text-muted-foreground">{mission.mission_type} · {mission.priority}</p>
            </div>
          ))}
          {missions.length === 0 && <Empty label="Aucune mission associée." />}
        </Section>
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: number; tone?: "default" | "success" | "warning" }) {
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

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/10 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <span className="text-right text-cream">{value}</span>
    </div>
  );
}

function Tag({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gold/10 px-2 py-1">
      <Icon className="h-3 w-3 text-primary" />
      {label}
    </span>
  );
}

function Bullet({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      {label}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
