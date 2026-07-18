import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
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

type GovernanceCase = {
  id: string;
  case_number: string;
  created_at: string;
  case_type_label: string | null;
  priority: "critical" | "high" | "normal" | "low";
  confidence_score: number;
  status: string;
  vendor_shop_id: string;
  product_name: string | null;
  problem: string;
  explanation: string;
  recommended_actions: string[];
  final_decision: string | null;
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

export default function VendorMarketplaceGovernancePanel({ shop }: { shop: VendorShop }) {
  const [cases, setCases] = useState<GovernanceCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<GovernanceCase | null>(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [casesResult, notificationsResult] = await Promise.all([
      db.from("my_marketplace_governance_cases").select("*").eq("vendor_shop_id", shop.id).order("created_at", { ascending: false }).limit(80),
      db.from("my_marketplace_governance_notifications").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (!casesResult.error) {
      const rows = toArray<GovernanceCase>(casesResult.data);
      setCases(rows);
      setSelectedCase((current) => current ?? rows[0] ?? null);
    }
    if (!notificationsResult.error) setNotifications(toArray<NotificationRow>(notificationsResult.data));
    if (casesResult.error) {
      toast({ title: "Gouvernance Marketplace indisponible", description: casesResult.error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [shop.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sendComment = async () => {
    if (!selectedCase || !comment.trim()) return;
    setIsWorking(true);
    const { error } = await db.rpc("comment_marketplace_governance_case", {
      _case_id: selectedCase.id,
      _comment: comment.trim(),
    });
    setIsWorking(false);
    if (error) {
      toast({ title: "Reponse impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reponse envoyee", description: "L'administration LPB verra votre commentaire dans le dossier." });
    setComment("");
    await loadData();
  };

  if (isLoading) {
    return (
      <Card className="border-gold/20 bg-noir/50">
        <CardContent className="flex min-h-[220px] items-center justify-center text-cream">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
          Chargement de la gouvernance Marketplace...
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
            Gouvernance Marketplace
          </CardTitle>
          <CardDescription>
            Dossiers de qualite ou de revision visibles pour votre boutique. Aucune action automatique n'est executee sans validation admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Metric label="Dossiers visibles" value={cases.length} />
          <Metric label="A traiter" value={cases.filter((item) => ["new", "in_progress", "waiting"].includes(item.status)).length} />
          <Metric label="Notifications" value={notifications.filter((item) => !item.read_at).length} />
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
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-3">
          {cases.length === 0 ? <EmptyState text="Aucun dossier visible pour votre boutique." /> : cases.map((item) => (
            <Card key={item.id} className="border-gold/10 bg-noir/40">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <button type="button" onClick={() => setSelectedCase(item)} className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cream">{item.case_number}</span>
                    <Badge variant={item.priority === "critical" ? "destructive" : "outline"}>{priorityLabel[item.priority]}</Badge>
                    <Badge variant="secondary">{statusLabel[item.status] || item.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-cream">{item.problem}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.product_name || shop.name}</div>
                </button>
                <Button variant="outline" onClick={() => setSelectedCase(item)} className="border-gold/30">
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
                <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                  <div className="mb-2 text-sm font-medium text-primary">Actions recommandees</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(selectedCase.recommended_actions || []).map((action) => <li key={action}>- {action}</li>)}
                  </ul>
                </div>
                {selectedCase.final_decision && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
                    <CheckCircle2 className="mr-2 inline h-4 w-4" />
                    {selectedCase.final_decision}
                  </div>
                )}
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ajouter une reponse pour l'administration LPB..." className="min-h-28 border-gold/20 bg-noir/60 text-cream" />
                <Button onClick={sendComment} disabled={isWorking || !comment.trim()} className="bg-gradient-gold text-noir">
                  {isWorking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                  Envoyer ma reponse
                </Button>
              </CardContent>
            </Card>
          )}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/40 p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-cream">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gold/20 bg-noir/30 p-8 text-center text-muted-foreground">{text}</div>;
}
