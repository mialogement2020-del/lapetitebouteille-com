import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Loader2, Save, Send, FileText, ShoppingCart, Shield, BadgeCheck, Clock, XCircle, Receipt, AlertCircle, Wallet } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthContext } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  useMyWholesalerProfile,
  useMyWholesalerApplications,
  useMyQuotes,
  type WholesalerProfile,
  type WholesalerApplication,
} from "@/hooks/useWholesaler";
import { useMyInvoices, useMyOutstanding, type WholesaleInvoice, type InvoiceStatus } from "@/hooks/useWholesaleInvoices";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const GrossistePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { isWholesaler, isLoading: rolesLoading } = useUserRoles();
  const { data: profile, isLoading: profileLoading, updateProfile } = useMyWholesalerProfile();
  const { data: applications = [], isLoading: appsLoading, apply } = useMyWholesalerApplications();
  const { data: quotes = [], isLoading: quotesLoading } = useMyQuotes();
  const { data: invoices = [], isLoading: invoicesLoading } = useMyInvoices();
  const { data: outstanding = 0 } = useMyOutstanding();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/connexion");
  }, [authLoading, isAuthenticated, navigate]);

  const loading = authLoading || rolesLoading || profileLoading || appsLoading;
  const pendingApp = applications.find((a) => a.status === "pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-32 pb-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center">
              <Building2 className="h-7 w-7 text-noir" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-cream">Espace Grossiste</h1>
              <p className="text-cream/60">Compte B2B, devis et achats en gros</p>
            </div>
          </motion.div>

          {isWholesaler && profile ? (
            <>
              <ProfileCard profile={profile} onSave={(d) => updateProfile.mutateAsync(d)} loading={updateProfile.isPending} />
              <BalanceCard profile={profile} outstanding={outstanding} />
              <InvoicesCard invoices={invoices} loading={invoicesLoading} />
              <QuotesCard quotes={quotes} loading={quotesLoading} />
            </>
          ) : pendingApp ? (
            <PendingCard app={pendingApp} />
          ) : (
            <ApplyCard
              onSubmit={async (d) => apply.mutateAsync(d)}
              loading={apply.isPending}
              previousApps={applications}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const PendingCard = ({ app }: { app: WholesalerApplication }) => (
  <Card className="bg-noir/50 border-gold/20">
    <CardHeader>
      <CardTitle className="text-cream flex items-center gap-2">
        <Clock className="h-5 w-5 text-yellow-400" /> Candidature en cours d'examen
      </CardTitle>
      <CardDescription className="text-cream/60">
        Soumise le {new Date(app.created_at).toLocaleDateString("fr-FR")} — notre équipe vous répond sous 48 h.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2 text-sm text-cream/80">
      <p><strong>{app.company_name}</strong> · {app.business_type === "entreprise" ? "Entreprise" : "Particulier"}</p>
      <p className="text-cream/60">{app.city} · {app.contact_phone}</p>
    </CardContent>
  </Card>
);

const ApplyCard = ({
  onSubmit,
  loading,
  previousApps,
}: {
  onSubmit: (d: any) => Promise<any>;
  loading: boolean;
  previousApps: WholesalerApplication[];
}) => {
  const [form, setForm] = useState({
    company_name: "",
    business_type: "particulier",
    niu: "",
    city: "",
    contact_phone: "",
    contact_email: "",
    estimated_monthly_volume: "",
    message: "",
  });

  const rejected = previousApps.find((a) => a.status === "rejected");

  const submit = async () => {
    if (!form.company_name.trim() || !form.city.trim() || !form.contact_phone.trim()) {
      return toast({ title: "Nom, ville et téléphone requis", variant: "destructive" });
    }
    try {
      await onSubmit({
        ...form,
        estimated_monthly_volume: form.estimated_monthly_volume ? Number(form.estimated_monthly_volume) : null,
      });
      toast({ title: "Candidature envoyée 🎉", description: "Nous reviendrons vers vous sous 48 h." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream">Devenir Grossiste B2B</CardTitle>
        <CardDescription className="text-cream/60">
          Accédez à des tarifs préférentiels par carton, palette ou caisse bois. Remplissez ce formulaire — validation
          sous 48 h ouvrées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rejected && rejected.admin_notes && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-200">
            <p className="font-medium flex items-center gap-2"><XCircle className="h-4 w-4" /> Candidature précédente refusée</p>
            <p className="text-red-300/80 mt-1">{rejected.admin_notes}</p>
          </div>
        )}

        <Field label="Raison sociale / Nom *" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />

        <div className="space-y-1.5">
          <Label className="text-cream/80 text-sm">Type d'activité *</Label>
          <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
            <SelectTrigger className="bg-noir/50 border-gold/20 text-cream">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">🎉 Particulier / Événement</SelectItem>
              <SelectItem value="entreprise">🏢 Entreprise (Bar, Maquis, Hôtel, Caviste)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.business_type === "entreprise" && (
          <Field label="NIU (Numéro Identifiant Unique)" value={form.niu} onChange={(v) => setForm({ ...form, niu: v })} />
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Ville *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Téléphone *" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
        </div>
        <Field label="Email de contact" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        <Field label="Volume mensuel estimé (FCFA)" value={form.estimated_monthly_volume} onChange={(v) => setForm({ ...form, estimated_monthly_volume: v })} />
        <Field label="Message / précisions" textarea value={form.message} onChange={(v) => setForm({ ...form, message: v })} />

        <Button onClick={submit} disabled={loading} className="bg-gradient-gold text-noir w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Envoyer ma candidature
        </Button>
      </CardContent>
    </Card>
  );
};

const ProfileCard = ({
  profile,
  onSave,
  loading,
}: {
  profile: WholesalerProfile;
  onSave: (d: Partial<WholesalerProfile>) => Promise<any>;
  loading: boolean;
}) => {
  const [form, setForm] = useState({
    company_name: profile.company_name,
    niu: profile.niu ?? "",
    city: profile.city ?? "",
    address: profile.address ?? "",
    contact_phone: profile.contact_phone ?? "",
    contact_email: profile.contact_email ?? "",
  });

  const submit = async () => {
    try {
      await onSave(form);
      toast({ title: "Profil mis à jour" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-cream flex items-center gap-2">
              {profile.company_name}
              <BadgeCheck className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription className="text-cream/60">
              Compte B2B vérifié · {profile.total_orders} commande(s) · {formatPrice(profile.total_spent)} FCFA dépensés
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="border-gold/30 text-cream">
            <Link to="/catalogue?gros=1">
              <ShoppingCart className="h-4 w-4 mr-2" /> Commander en gros
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Raison sociale" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="NIU" value={form.niu} onChange={(v) => setForm({ ...form, niu: v })} />
          <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        </div>
        <Field label="Adresse de livraison" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Téléphone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
          <Field label="Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} />
        </div>
        <Button onClick={submit} disabled={loading} className="bg-gradient-gold text-noir">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

const QUOTE_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "border-yellow-500/40 text-yellow-400" },
  traite: { label: "Traité", color: "border-green-500/40 text-green-400" },
  refuse: { label: "Refusé", color: "border-red-500/40 text-red-400" },
};

const INVOICE_LABELS: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "border-cream/20 text-cream/60" },
  sent: { label: "À régler", color: "border-yellow-500/40 text-yellow-400" },
  partial: { label: "Partiel", color: "border-orange-500/40 text-orange-400" },
  paid: { label: "Payée", color: "border-green-500/40 text-green-400" },
  overdue: { label: "En retard", color: "border-red-500/40 text-red-400" },
  cancelled: { label: "Annulée", color: "border-cream/20 text-cream/40" },
};

const BalanceCard = ({ profile, outstanding }: { profile: WholesalerProfile; outstanding: number }) => {
  const limit = Number(profile.credit_limit ?? 0);
  const usage = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0;
  const overLimit = limit > 0 && outstanding > limit;

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-cream flex items-center gap-2 text-base">
          <Wallet className="h-5 w-5 text-primary" /> Encours & crédit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-noir/40 border border-gold/10 p-3">
            <p className="text-xs text-cream/50 uppercase tracking-wide">Encours impayé</p>
            <p className="text-cream font-display text-xl mt-1">{formatPrice(outstanding)} FCFA</p>
          </div>
          <div className="rounded-lg bg-noir/40 border border-gold/10 p-3">
            <p className="text-xs text-cream/50 uppercase tracking-wide">Plafond de crédit</p>
            <p className="text-cream font-display text-xl mt-1">
              {limit > 0 ? `${formatPrice(limit)} FCFA` : "—"}
            </p>
          </div>
        </div>
        {limit > 0 && (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-noir/60 overflow-hidden">
              <div
                className={`h-full transition-all ${overLimit ? "bg-red-500" : "bg-gradient-gold"}`}
                style={{ width: `${usage}%` }}
              />
            </div>
            <p className={`text-xs ${overLimit ? "text-red-400" : "text-cream/50"} flex items-center gap-1.5`}>
              {overLimit && <AlertCircle className="h-3.5 w-3.5" />}
              {overLimit
                ? "Plafond dépassé — règlement requis avant nouvelle commande"
                : `${usage.toFixed(0)}% du plafond utilisé`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InvoicesCard = ({ invoices, loading }: { invoices: WholesaleInvoice[]; loading: boolean }) => (
  <Card className="bg-noir/50 border-gold/20">
    <CardHeader>
      <CardTitle className="text-cream flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" /> Mes factures
      </CardTitle>
      <CardDescription className="text-cream/60">
        {invoices.length} facture{invoices.length > 1 ? "s" : ""}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      ) : invoices.length === 0 ? (
        <p className="text-cream/60 text-sm py-8 text-center">Aucune facture émise pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const status = INVOICE_LABELS[inv.status];
            const remaining = Number(inv.amount_ttc) - Number(inv.amount_paid);
            return (
              <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg bg-noir/30 border border-gold/10">
                <div className="flex-1 min-w-0">
                  <p className="text-cream font-medium truncate">{inv.invoice_number}</p>
                  <p className="text-xs text-cream/50 truncate">{inv.description}</p>
                  <p className="text-xs text-cream/40 mt-0.5">
                    Émise le {new Date(inv.issued_at).toLocaleDateString("fr-FR")}
                    {inv.due_date && <> · échéance {new Date(inv.due_date).toLocaleDateString("fr-FR")}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-cream font-display">{formatPrice(inv.amount_ttc)} FCFA</p>
                  {remaining > 0 && inv.status !== "cancelled" && (
                    <p className="text-xs text-yellow-400">Reste {formatPrice(remaining)} FCFA</p>
                  )}
                </div>
                <Badge variant="outline" className={status.color}>{status.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

const QuotesCard = ({ quotes, loading }: { quotes: any[]; loading: boolean }) => (
  <Card className="bg-noir/50 border-gold/20">
    <CardHeader>
      <CardTitle className="text-cream flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" /> Mes demandes de devis
      </CardTitle>
      <CardDescription className="text-cream/60">
        {quotes.length} devis envoyé{quotes.length > 1 ? "s" : ""}
      </CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      ) : quotes.length === 0 ? (
        <p className="text-cream/60 text-sm py-8 text-center">
          Vous n'avez encore demandé aucun devis. Lancez votre première commande en gros depuis le catalogue.
        </p>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => {
            const status = QUOTE_LABELS[q.status] ?? { label: q.status, color: "border-cream/20 text-cream/60" };
            return (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-noir/30 border border-gold/10">
                <div className="flex-1 min-w-0">
                  <p className="text-cream truncate font-medium">{q.product_name}</p>
                  <p className="text-xs text-cream/50">
                    {q.packaging_type} × {q.quantity} · {formatPrice(q.total_price)} FCFA · {new Date(q.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Badge variant="outline" className={status.color}>{status.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
);

const Field = ({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) => (
  <div className="space-y-1.5">
    <Label className="text-cream/80 text-sm">{label}</Label>
    {textarea ? (
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="bg-noir/50 border-gold/20 text-cream min-h-24" />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-noir/50 border-gold/20 text-cream" />
    )}
  </div>
);

export default GrossistePage;