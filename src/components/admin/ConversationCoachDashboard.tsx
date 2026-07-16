import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Gift,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const db = supabase as any;

type CoachRecommendation = {
  id: string;
  recommendation_type: string;
  product_id: string | null;
  title: string;
  rationale: string | null;
  suggested_message: string | null;
  score: number;
  metadata: Record<string, unknown> | null;
};

type ResponseVariant = {
  id: string;
  variant_type: string;
  content: string;
  tone: string;
  is_selected: boolean;
};

type Feedback = {
  outcome: string;
  reason: string | null;
  created_at: string;
} | null;

type CoachSession = {
  id: string;
  advisor_id: string;
  source_channel: string;
  mode: string;
  conversation_text: string;
  detected_budget: number | null;
  detected_occasion: string | null;
  detected_city: string | null;
  detected_customer_type: string | null;
  detected_intent: string | null;
  detected_urgency: string | null;
  detected_objections: string[];
  detected_risk_flags: string[];
  created_at: string;
  recommendations: CoachRecommendation[];
  response_variants: ResponseVariant[];
  latest_feedback: Feedback;
};

type ScriptTemplate = {
  id: string;
  script_type: string;
  title: string;
  content: string;
  is_active: boolean;
};

type AdminReportRow = {
  advisor_id: string;
  conversations_analyzed: number;
  won_total: number;
  lost_total: number;
  no_response_total: number;
  follow_up_total: number;
  estimated_success_rate: number | null;
  frequent_objections: string[] | null;
  last_conversation_at: string | null;
};

const modeLabels: Record<string, string> = {
  general: "General",
  gift: "Cadeau",
  wedding: "Mariage",
  company: "Entreprise",
  wholesale: "Gros",
  birthday: "Anniversaire",
  abandoned_cart: "Panier abandonne",
  follow_up: "Relance",
};

const variantLabels: Record<string, string> = {
  short: "Court",
  professional: "Professionnel",
  warm: "Chaleureux",
  premium: "Premium",
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
};

const objectionLabels: Record<string, string> = {
  price: "Prix",
  thinking: "Reflexion",
  competitor: "Concurrent",
  delivery_fee: "Frais livraison",
  unknown_brand: "Marque inconnue",
};

const formatFcfa = (value: number | null | undefined) =>
  value ? `${Math.round(Number(value)).toLocaleString("fr-FR")} FCFA` : "Non detecte";

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Jamais";

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const getMetadataNumber = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return typeof value === "number" ? value : null;
};

export default function ConversationCoachDashboard() {
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [scripts, setScripts] = useState<ScriptTemplate[]>([]);
  const [report, setReport] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [conversationText, setConversationText] = useState("");
  const [mode, setMode] = useState("general");
  const [sourceChannel, setSourceChannel] = useState("whatsapp");

  const load = async () => {
    setLoading(true);
    const [sessionsRes, scriptsRes, reportRes] = await Promise.all([
      db.from("advisor_conversation_coach_dashboard").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("advisor_coach_script_library").select("*").order("script_type", { ascending: true }),
      db.from("admin_conversation_coach_report").select("*").limit(100),
    ]);

    if (sessionsRes.error) {
      toast({ title: "Coach IA indisponible", description: sessionsRes.error.message, variant: "destructive" });
    } else {
      setSessions(
        (sessionsRes.data || []).map((session: any) => ({
          ...session,
          recommendations: asArray<CoachRecommendation>(session.recommendations),
          response_variants: asArray<ResponseVariant>(session.response_variants),
          detected_objections: asArray<string>(session.detected_objections),
          detected_risk_flags: asArray<string>(session.detected_risk_flags),
        })),
      );
    }

    if (!scriptsRes.error) setScripts((scriptsRes.data || []) as ScriptTemplate[]);
    if (!reportRes.error) setReport((reportRes.data || []) as AdminReportRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestSession = sessions[0] || null;
  const wonTotal = sessions.filter((session) => session.latest_feedback?.outcome === "won").length;
  const lostTotal = sessions.filter((session) => session.latest_feedback?.outcome === "lost").length;
  const followUpTotal = sessions.filter((session) => session.latest_feedback?.outcome === "follow_up").length;
  const successRate = useMemo(() => {
    const decided = wonTotal + lostTotal;
    if (!decided) return 0;
    return Math.round((wonTotal / decided) * 100);
  }, [wonTotal, lostTotal]);

  const analyzeConversation = async () => {
    if (!conversationText.trim()) {
      toast({ title: "Message client manquant", description: "Collez un message WhatsApp, email ou note client.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    const { error } = await db.rpc("coach_analyze_conversation", {
      _conversation_text: conversationText.trim(),
      _contact_id: null,
      _source_channel: sourceChannel,
      _mode: mode,
    });
    setAnalyzing(false);

    if (error) {
      toast({ title: "Analyse impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Conversation analysee", description: "Le Coach IA a genere des suggestions sans envoyer de message." });
    setConversationText("");
    void load();
  };

  const recordFeedback = async (sessionId: string, outcome: string) => {
    const { error } = await db.rpc("coach_record_feedback", {
      _session_id: sessionId,
      _outcome: outcome,
      _reason: "Retour conseiller depuis le dashboard P1.4",
      _selected_variant_id: null,
    });

    if (error) {
      toast({ title: "Retour impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Retour enregistre" });
    void load();
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Texte copie" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gold/20 bg-noir/40 text-cream">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Chargement du Coach IA...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-playfair text-3xl text-gold">P1.4 Coach IA Conversationnel</h2>
          <p className="text-muted-foreground">
            Analyse les messages clients, suggere des reponses et recommande des produits. Aucun envoi automatique.
          </p>
        </div>
        <Button onClick={load} variant="outline" className="border-gold/30">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Conversations analysees" value={sessions.length.toString()} icon={MessageCircle} />
        <MetricCard title="Ventes gagnees" value={wonTotal.toString()} icon={CheckCircle2} />
        <MetricCard title="Relances a suivre" value={followUpTotal.toString()} icon={TrendingUp} />
        <MetricCard title="Succes estime" value={`${successRate} %`} icon={Sparkles} />
      </div>

      <Tabs defaultValue="coach" className="space-y-6">
        <TabsList className="border border-gold/20 bg-noir/70">
          <TabsTrigger value="coach">Coach</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="admin">Pilotage</TabsTrigger>
        </TabsList>

        <TabsContent value="coach" className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-gold/20 bg-noir/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <Bot className="h-5 w-5 text-gold" />
                Nouvelle analyse
              </CardTitle>
              <CardDescription>Collez un message client. Le conseiller reste seul decisionnaire.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={sourceChannel} onValueChange={setSourceChannel}>
                    <SelectTrigger className="border-gold/20 bg-noir/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="phone_note">Note appel</SelectItem>
                      <SelectItem value="free_question">Question libre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contexte</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="border-gold/20 bg-noir/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(modeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message client</Label>
                <Textarea
                  value={conversationText}
                  onChange={(event) => setConversationText(event.target.value)}
                  placeholder="Exemple : Bonjour, je cherche un champagne pour un mariage samedi a Douala, budget 50 000 FCFA..."
                  className="min-h-[220px] border-gold/20 bg-noir/40"
                />
              </div>

              <Button onClick={analyzeConversation} disabled={analyzing} className="w-full bg-gold text-noir hover:bg-gold/90">
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Analyser et proposer
              </Button>
            </CardContent>
          </Card>

          <LatestSessionCard session={latestSession} onCopy={copyText} onFeedback={recordFeedback} />
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-gold/20 bg-noir/70">
            <CardHeader>
              <CardTitle className="text-cream">Historique des conversations</CardTitle>
              <CardDescription>Chaque ligne reste liee au conseiller qui a lance l'analyse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-gold/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-gold/15 text-gold">{modeLabels[session.mode] || session.mode}</Badge>
                        <Badge variant="outline">{session.detected_intent || "intent inconnu"}</Badge>
                        <Badge variant="outline">{formatDate(session.created_at)}</Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{session.conversation_text}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => recordFeedback(session.id, "won")}>
                        Gagnee
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => recordFeedback(session.id, "follow_up")}>
                        A relancer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => recordFeedback(session.id, "lost")}>
                        Perdue
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!sessions.length && <p className="text-sm text-muted-foreground">Aucune conversation analysee pour le moment.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scripts.map((script) => (
              <Card key={script.id} className="border-gold/20 bg-noir/70">
                <CardHeader>
                  <CardTitle className="text-base text-cream">{script.title}</CardTitle>
                  <CardDescription>{script.script_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{script.content}</p>
                  <Button size="sm" variant="outline" onClick={() => copyText(script.content)}>
                    <Clipboard className="mr-2 h-4 w-4" />
                    Copier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="admin">
          <Card className="border-gold/20 bg-noir/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <BriefcaseBusiness className="h-5 w-5 text-gold" />
                Pilotage Coach IA
              </CardTitle>
              <CardDescription>Vue admin agregée. Le module ne lit pas les couts, marges, pools ni commissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.map((row) => (
                <div key={row.advisor_id} className="grid gap-3 rounded-lg border border-gold/10 bg-black/20 p-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Conseiller</p>
                    <p className="font-medium text-cream">{row.advisor_id.slice(0, 8)}...</p>
                  </div>
                  <MetricLine label="Analyses" value={row.conversations_analyzed} />
                  <MetricLine label="Gagnees" value={row.won_total} />
                  <MetricLine label="Perdues" value={row.lost_total} />
                  <MetricLine label="Succes" value={`${Math.round(Number(row.estimated_success_rate || 0))} %`} />
                </div>
              ))}
              {!report.length && <p className="text-sm text-muted-foreground">Aucun rapport admin disponible.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="border-gold/20 bg-noir/70">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold text-cream">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-gold" />
      </CardContent>
    </Card>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-cream">{value}</p>
    </div>
  );
}

function LatestSessionCard({
  session,
  onCopy,
  onFeedback,
}: {
  session: CoachSession | null;
  onCopy: (value: string) => void;
  onFeedback: (sessionId: string, outcome: string) => void;
}) {
  if (!session) {
    return (
      <Card className="border-gold/20 bg-noir/70">
        <CardHeader>
          <CardTitle className="text-cream">Derniere analyse</CardTitle>
          <CardDescription>Les suggestions apparaitront ici apres analyse.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[360px] items-center justify-center text-muted-foreground">
          <Gift className="mr-2 h-5 w-5 text-gold" />
          Aucune analyse disponible.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/20 bg-noir/70">
      <CardHeader>
        <CardTitle className="text-cream">Derniere analyse</CardTitle>
        <CardDescription>
          Budget {formatFcfa(session.detected_budget)} · {modeLabels[session.mode] || session.mode} · {session.detected_city || "ville non detectee"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-gold/15 text-gold">Intent: {session.detected_intent || "non detecte"}</Badge>
          <Badge variant="outline">Urgence: {session.detected_urgency || "normale"}</Badge>
          <Badge variant="outline">Client: {session.detected_customer_type || "particulier"}</Badge>
          {session.detected_objections.map((objection) => (
            <Badge key={objection} className="bg-red-500/15 text-red-200">
              {objectionLabels[objection] || objection}
            </Badge>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-cream">Reponses pretes a adapter</h3>
          <div className="grid gap-3">
            {session.response_variants.map((variant) => (
              <div key={variant.id} className="rounded-lg border border-gold/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline">{variantLabels[variant.variant_type] || variant.variant_type}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => onCopy(variant.content)}>
                    <Clipboard className="mr-2 h-4 w-4" />
                    Copier
                  </Button>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{variant.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-cream">Produits et arguments suggeres</h3>
          {session.recommendations.map((recommendation) => (
            <div key={recommendation.id} className="rounded-lg border border-gold/10 bg-black/20 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-cream">{recommendation.title}</p>
                  <p className="text-sm text-muted-foreground">{recommendation.rationale}</p>
                </div>
                <Badge className="bg-gold/15 text-gold">{Math.round(Number(recommendation.score || 0))}%</Badge>
              </div>
              {recommendation.suggested_message && (
                <p className="mt-2 text-sm text-muted-foreground">{recommendation.suggested_message}</p>
              )}
              {getMetadataNumber(recommendation.metadata, "sale_price") && (
                <p className="mt-2 text-sm text-gold">{formatFcfa(getMetadataNumber(recommendation.metadata, "sale_price"))}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gold/10 pt-4">
          <Button size="sm" onClick={() => onFeedback(session.id, "won")}>
            Gagnee
          </Button>
          <Button size="sm" variant="outline" onClick={() => onFeedback(session.id, "follow_up")}>
            A relancer
          </Button>
          <Button size="sm" variant="outline" onClick={() => onFeedback(session.id, "no_response")}>
            Pas de reponse
          </Button>
          <Button size="sm" variant="outline" onClick={() => onFeedback(session.id, "lost")}>
            Perdue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
