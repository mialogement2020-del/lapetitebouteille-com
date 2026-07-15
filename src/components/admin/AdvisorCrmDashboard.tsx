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
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CrmContact = {
  id: string;
  owner_advisor_id: string;
  linked_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  company_name: string | null;
  contact_type: string;
  relationship_status: string;
  pipeline_stage: string;
  source: string;
  preferred_channel: string;
  birthday: string | null;
  consent_status: string;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type CrmTask = {
  id: string;
  contact_id: string | null;
  advisor_id: string;
  task_type: string;
  title: string;
  description: string | null;
  due_at: string;
  priority: string;
  status: string;
};

type CrmOpportunity = {
  id: string;
  contact_id: string;
  title: string;
  opportunity_type: string;
  estimated_budget: number | null;
  stage: string;
  probability: number;
  status: string;
};

type OrderSummary = {
  contact_id: string;
  order_count: number;
  last_order_at: string | null;
  average_order_total: number | null;
  total_revenue: number;
  last_shipping_city: string | null;
};

type DashboardSummary = {
  contacts_total: number;
  prospects_active: number;
  customers_active: number;
  dormant_contacts: number;
  company_contacts: number;
  tasks_due: number;
  hot_opportunities: number;
  duplicate_candidates: number;
};

type NewContactForm = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  company_name: string;
  contact_type: string;
  relationship_status: string;
  preferred_channel: string;
};

const db = supabase as any;

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  new: "Nouveau",
  interested: "Intéressé",
  hot: "Chaud",
  client: "Client",
  loyal: "Fidèle",
  dormant: "Dormant",
  vip: "VIP",
  company: "Entreprise",
  lost: "Perdu",
  archived: "Archivé",
};

const STATUS_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-300 border-red-500/30",
  vip: "bg-gold/20 text-gold border-gold/40",
  loyal: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  client: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  dormant: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  company: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  lost: "bg-red-900/30 text-red-200 border-red-700/30",
};

const formatFcfa = (value: number | null | undefined) =>
  `${Math.round(Number(value || 0)).toLocaleString("fr-FR")} FCFA`;

const fullName = (contact: CrmContact) => {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return name || contact.company_name || contact.email || contact.phone || "Contact sans nom";
};

const emptyForm: NewContactForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  city: "",
  company_name: "",
  contact_type: "individual",
  relationship_status: "prospect",
  preferred_channel: "whatsapp",
};

export default function AdvisorCrmDashboard() {
  const { user } = useAuthContext();
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [form, setForm] = useState<NewContactForm>(emptyForm);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [contactRes, taskRes, oppRes, orderRes, summaryRes] = await Promise.all([
      db.from("crm_contacts").select("*").is("archived_at", null).order("updated_at", { ascending: false }).limit(300),
      db.from("crm_tasks").select("*").in("status", ["open", "in_progress"]).order("due_at", { ascending: true }).limit(80),
      db.from("crm_opportunities").select("*").eq("status", "open").order("probability", { ascending: false }).limit(80),
      db.from("crm_contact_order_summary").select("*"),
      db.from("crm_dashboard_summary").select("*").maybeSingle(),
    ]);

    if (contactRes.error) {
      toast({
        title: "CRM non disponible",
        description: contactRes.error.message,
        variant: "destructive",
      });
    } else {
      setContacts((contactRes.data || []) as CrmContact[]);
    }

    if (!taskRes.error) setTasks((taskRes.data || []) as CrmTask[]);
    if (!oppRes.error) setOpportunities((oppRes.data || []) as CrmOpportunity[]);
    if (!orderRes.error) setOrders((orderRes.data || []) as OrderSummary[]);
    if (!summaryRes.error) setSummary(summaryRes.data as DashboardSummary | null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderByContact = useMemo(() => {
    const map = new Map<string, OrderSummary>();
    orders.forEach((row) => map.set(row.contact_id, row));
    return map;
  }, [orders]);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesStatus = statusFilter === "all" || contact.relationship_status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return [
        fullName(contact),
        contact.email,
        contact.phone,
        contact.city,
        contact.company_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [contacts, query, statusFilter]);

  const selectedOrders = selectedContact ? orderByContact.get(selectedContact.id) : null;
  const selectedTasks = selectedContact ? tasks.filter((task) => task.contact_id === selectedContact.id) : [];
  const selectedOpportunities = selectedContact
    ? opportunities.filter((opportunity) => opportunity.contact_id === selectedContact.id)
    : [];

  const saveContact = async () => {
    if (!user?.id) return;
    if (!form.first_name && !form.last_name && !form.phone && !form.email && !form.company_name) {
      toast({ title: "Contact incomplet", description: "Ajoute au moins un nom, une entreprise, un téléphone ou un email.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      owner_advisor_id: user.id,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      company_name: form.company_name || null,
      contact_type: form.contact_type,
      relationship_status: form.relationship_status,
      preferred_channel: form.preferred_channel,
      source: "manual",
    };
    const { error } = await db.from("crm_contacts").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Création impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contact CRM créé" });
    setContactDialogOpen(false);
    setForm(emptyForm);
    void load();
  };

  const updateStatus = async (contact: CrmContact, status: string) => {
    const { error } = await db
      .from("crm_contacts")
      .update({ relationship_status: status })
      .eq("id", contact.id);
    if (error) {
      toast({ title: "Statut non mis à jour", description: error.message, variant: "destructive" });
      return;
    }
    await db.rpc("crm_log_activity", {
      _contact_id: contact.id,
      _activity_type: "status_changed",
      _summary: `Statut CRM changé vers ${STATUS_LABELS[status] || status}`,
      _channel: "system",
      _metadata: { previous_status: contact.relationship_status, new_status: status },
    });
    toast({ title: "Statut CRM mis à jour" });
    void load();
  };

  const createTask = async () => {
    if (!user?.id || !selectedContact) return;
    if (!taskTitle || !taskDueAt) {
      toast({ title: "Relance incomplète", description: "Titre et date sont obligatoires.", variant: "destructive" });
      return;
    }
    const { error } = await db.from("crm_tasks").insert({
      contact_id: selectedContact.id,
      advisor_id: user.id,
      task_type: "follow_up",
      title: taskTitle,
      due_at: new Date(taskDueAt).toISOString(),
      priority: "medium",
      status: "open",
    });
    if (error) {
      toast({ title: "Relance non créée", description: error.message, variant: "destructive" });
      return;
    }
    await db.rpc("crm_log_activity", {
      _contact_id: selectedContact.id,
      _activity_type: "task_created",
      _summary: `Relance planifiée : ${taskTitle}`,
      _channel: "system",
      _metadata: { due_at: taskDueAt },
    });
    setTaskTitle("");
    setTaskDueAt("");
    setTaskDialogOpen(false);
    toast({ title: "Relance créée" });
    void load();
  };

  const addNote = async () => {
    if (!user?.id || !selectedContact || !noteContent.trim()) return;
    const { error } = await db.from("crm_notes").insert({
      contact_id: selectedContact.id,
      advisor_id: user.id,
      content: noteContent.trim(),
      is_sensitive: false,
    });
    if (error) {
      toast({ title: "Note non ajoutée", description: error.message, variant: "destructive" });
      return;
    }
    await db.rpc("crm_log_activity", {
      _contact_id: selectedContact.id,
      _activity_type: "note_added",
      _summary: "Note commerciale ajoutée",
      _channel: "system",
      _metadata: {},
    });
    setNoteContent("");
    setNoteDialogOpen(false);
    toast({ title: "Note ajoutée" });
  };

  const completeTask = async (task: CrmTask) => {
    const { error } = await db.rpc("crm_complete_task", {
      _task_id: task.id,
      _summary: `Relance terminée : ${task.title}`,
    });
    if (error) {
      toast({ title: "Tâche non terminée", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tâche terminée" });
    void load();
  };

  const archiveContact = async (contact: CrmContact) => {
    const { error } = await db.rpc("crm_archive_contact", {
      _contact_id: contact.id,
      _reason: "Archivage manuel depuis le CRM",
    });
    if (error) {
      toast({ title: "Archivage impossible", description: error.message, variant: "destructive" });
      return;
    }
    setSelectedContact(null);
    toast({ title: "Contact archivé" });
    void load();
  };

  const copy = async (value: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: "Copié" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-gold/20 bg-noir/50 text-cream">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Chargement du CRM...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-primary">P1 CRM Conseiller LPB</h2>
          <p className="text-sm text-muted-foreground">
            Portefeuille client, relances et opportunités commerciales. Aucun mouvement financier n'est créé ici.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setContactDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau contact
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={Users} label="Contacts actifs" value={summary?.contacts_total ?? contacts.length} />
        <KpiCard icon={CalendarDays} label="Relances dues" value={summary?.tasks_due ?? 0} tone="warning" />
        <KpiCard icon={Target} label="Opportunités chaudes" value={summary?.hot_opportunities ?? 0} tone="success" />
        <KpiCard icon={BriefcaseBusiness} label="Entreprises" value={summary?.company_contacts ?? 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <Card className="border-gold/20 bg-noir/50">
          <CardHeader>
            <CardTitle className="text-primary">Portefeuille</CardTitle>
            <CardDescription>Recherche, statut relationnel et prochaine action commerciale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher nom, téléphone, email, ville..."
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gold/10 text-left text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3">Contact</th>
                    <th className="py-3 pr-3">Statut</th>
                    <th className="py-3 pr-3">Canal</th>
                    <th className="py-3 pr-3 text-right">Commandes</th>
                    <th className="py-3 text-right">CA client</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => {
                    const order = orderByContact.get(contact.id);
                    const isSelected = selectedContact?.id === contact.id;
                    return (
                      <tr
                        key={contact.id}
                        className={`cursor-pointer border-b border-gold/5 hover:bg-cream/5 ${isSelected ? "bg-gold/10" : ""}`}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-medium text-cream">{fullName(contact)}</div>
                          <div className="text-xs text-muted-foreground">
                            {[contact.phone, contact.email, contact.city].filter(Boolean).join(" · ") || "Coordonnées à compléter"}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge className={STATUS_STYLES[contact.relationship_status] || "border-gold/20 bg-noir/40 text-cream"}>
                            {STATUS_LABELS[contact.relationship_status] || contact.relationship_status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3 capitalize text-muted-foreground">{contact.preferred_channel}</td>
                        <td className="py-3 pr-3 text-right text-cream">{order?.order_count ?? 0}</td>
                        <td className="py-3 text-right text-primary">{formatFcfa(order?.total_revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredContacts.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">Aucun contact pour ce filtre.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 bg-noir/50">
          <CardHeader>
            <CardTitle className="text-primary">Fiche contact</CardTitle>
            <CardDescription>
              Données commerciales utiles uniquement. Les marges, coûts et snapshots financiers restent exclus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedContact ? (
              <div className="rounded-lg border border-dashed border-gold/20 p-8 text-center text-sm text-muted-foreground">
                Sélectionne un contact dans le portefeuille.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-cream">{fullName(selectedContact)}</h3>
                    <p className="text-sm text-muted-foreground">{selectedContact.company_name || selectedContact.city || "Relation commerciale LPB"}</p>
                  </div>
                  <Select value={selectedContact.relationship_status} onValueChange={(value) => updateStatus(selectedContact, value)}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <QuickAction icon={Phone} label={selectedContact.phone || "Téléphone absent"} href={selectedContact.phone ? `tel:${selectedContact.phone}` : undefined} onCopy={() => copy(selectedContact.phone)} />
                  <QuickAction icon={MessageCircle} label="WhatsApp" href={selectedContact.phone ? `https://wa.me/${selectedContact.phone.replace(/[^0-9]/g, "")}` : undefined} />
                  <QuickAction icon={Mail} label={selectedContact.email || "Email absent"} href={selectedContact.email ? `mailto:${selectedContact.email}` : undefined} onCopy={() => copy(selectedContact.email)} />
                  <Button variant="outline" onClick={() => archiveContact(selectedContact)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archiver
                  </Button>
                </div>

                <Tabs defaultValue="orders">
                  <TabsList>
                    <TabsTrigger value="orders">Commandes</TabsTrigger>
                    <TabsTrigger value="tasks">Relances</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunités</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders" className="space-y-3 pt-3">
                    <InfoLine label="Nombre de commandes" value={String(selectedOrders?.order_count ?? 0)} />
                    <InfoLine label="Dernière commande" value={selectedOrders?.last_order_at ? new Date(selectedOrders.last_order_at).toLocaleDateString("fr-FR") : "Aucune"} />
                    <InfoLine label="Panier moyen" value={formatFcfa(selectedOrders?.average_order_total)} />
                    <InfoLine label="Ville livraison" value={selectedOrders?.last_shipping_city || "Non renseignée"} />
                  </TabsContent>

                  <TabsContent value="tasks" className="space-y-3 pt-3">
                    <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Planifier une relance
                    </Button>
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-lg border border-gold/10 p-3">
                        <div>
                          <p className="font-medium text-cream">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(task.due_at).toLocaleString("fr-FR")} · {task.priority}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => completeTask(task)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Terminer
                        </Button>
                      </div>
                    ))}
                    {selectedTasks.length === 0 && <p className="text-sm text-muted-foreground">Aucune relance ouverte.</p>}
                  </TabsContent>

                  <TabsContent value="opportunities" className="space-y-3 pt-3">
                    {selectedOpportunities.map((opportunity) => (
                      <div key={opportunity.id} className="rounded-lg border border-gold/10 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-cream">{opportunity.title}</p>
                          <Badge variant="outline">{opportunity.probability}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {opportunity.stage} · {formatFcfa(opportunity.estimated_budget)}
                        </p>
                      </div>
                    ))}
                    {selectedOpportunities.length === 0 && <p className="text-sm text-muted-foreground">Aucune opportunité ouverte.</p>}
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3 pt-3">
                    <Button size="sm" onClick={() => setNoteDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une note
                    </Button>
                    <p className="rounded-lg border border-gold/10 p-3 text-sm text-muted-foreground">
                      Les notes sensibles restent protégées par RLS. Cette première interface ajoute des notes commerciales non sensibles.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau contact CRM</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Prénom" value={form.first_name} onChange={(value) => setForm({ ...form, first_name: value })} />
            <Field label="Nom" value={form.last_name} onChange={(value) => setForm({ ...form, last_name: value })} />
            <Field label="Téléphone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Ville" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <Field label="Entreprise" value={form.company_name} onChange={(value) => setForm({ ...form, company_name: value })} />
            <div>
              <Label>Type</Label>
              <Select value={form.contact_type} onValueChange={(value) => setForm({ ...form, contact_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Particulier</SelectItem>
                  <SelectItem value="company">Entreprise</SelectItem>
                  <SelectItem value="wholesale">Grossiste</SelectItem>
                  <SelectItem value="event">Événement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.relationship_status} onValueChange={(value) => setForm({ ...form, relationship_status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveContact} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier une relance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Titre" value={taskTitle} onChange={setTaskTitle} />
            <div>
              <Label>Date et heure</Label>
              <Input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Annuler</Button>
            <Button onClick={createTask}>Créer la relance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Résumé de l'échange, préférence, contexte commercial..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Annuler</Button>
            <Button onClick={addNote}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone = "default" }: { icon: LucideIcon; label: string; value: number; tone?: "default" | "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-400" : tone === "warning" ? "text-orange-300" : "text-primary";
  return (
    <Card className="border-gold/20 bg-noir/50">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-display ${color}`}>{value.toLocaleString("fr-FR")}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gold/10 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-cream">{value}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, onCopy }: { icon: LucideIcon; label: string; href?: string; onCopy?: () => void }) {
  const content = (
    <>
      <Icon className="mr-2 h-4 w-4" />
      <span className="truncate">{label}</span>
    </>
  );
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="min-w-0 flex-1 justify-start" disabled={!href} asChild={Boolean(href)}>
        {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{content}</a> : <span>{content}</span>}
      </Button>
      {onCopy && (
        <Button variant="outline" size="icon" onClick={onCopy} disabled={!label || label.includes("absent")}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
