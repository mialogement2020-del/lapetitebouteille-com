import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";

type StudioJob = {
  id: string;
  product_id: string | null;
  product_name?: string | null;
  vendor_id: string | null;
  original_image_url: string;
  corrected_image_url: string | null;
  published_image_url: string | null;
  status: string;
  decision: string;
  compliance_score: number | null;
  product_detected: string | null;
  issues: string[] | null;
  corrections: string[] | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type DashboardStats = {
  total_jobs: number;
  in_pipeline: number;
  pending_admin_review: number;
  published: number;
  blocked: number;
  average_compliance_score: number;
  auto_publish_decisions: number;
  auto_correct_publish_decisions: number;
  manual_review_decisions: number;
  reject_decisions: number;
};

type SupabaseRpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const rpc = supabase.rpc as unknown as SupabaseRpc;

const statusClass: Record<string, string> = {
  uploaded: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  analyzing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  needs_correction: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  corrected: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  pending_admin_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  auto_published: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  new_image_requested: "bg-red-500/15 text-red-300 border-red-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
};

const decisionLabel: Record<string, string> = {
  pending: "En attente",
  auto_publish: "Publication auto",
  auto_correct_publish: "Correction + publication",
  manual_review: "Validation admin",
  reject: "Refus",
};

const formatScore = (score: number | null | undefined) => `${Math.round(Number(score ?? 0))} %`;

const normalizeArray = (value: string[] | null | undefined) => Array.isArray(value) ? value : [];

export default function MarketplaceImageStudioDashboard() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [simulationScore, setSimulationScore] = useState("92");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["marketplace-image-studio-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_image_studio_dashboard" as never)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return ((data as unknown) ?? {
        total_jobs: 0,
        in_pipeline: 0,
        pending_admin_review: 0,
        published: 0,
        blocked: 0,
        average_compliance_score: 0,
        auto_publish_decisions: 0,
        auto_correct_publish_decisions: 0,
        manual_review_decisions: 0,
        reject_decisions: 0,
      }) as DashboardStats;
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["marketplace-image-studio-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_marketplace_image_studio_queue" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return ((data ?? []) as unknown) as StudioJob[];
    },
  });

  const selectedJob = useMemo(
    () => (jobsQuery.data ?? []).find((job) => job.id === selectedJobId) ?? (jobsQuery.data ?? [])[0],
    [jobsQuery.data, selectedJobId],
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["marketplace-image-studio-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["marketplace-image-studio-jobs"] });
  };

  const createJobMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await rpc("marketplace_image_studio_create_job", {
        _product_id: productId.trim() || null,
        _original_image_url: imageUrl.trim(),
        _original_storage_path: null,
        _vendor_id: null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      setProductId("");
      setImageUrl("");
      refreshAll();
      toast({ title: "Image envoyee au Studio LPB", description: "Elle reste bloquee jusqu'au controle qualite." });
    },
    onError: (error: Error) => toast({ title: "Erreur Studio Image", description: error.message, variant: "destructive" }),
  });

  const simulateAnalysisMutation = useMutation({
    mutationFn: async (job: StudioJob) => {
      const score = Number(simulationScore);
      const issues = score >= 90 ? [] : score >= 75 ? ["fond_non_uniforme_corrige"] : ["validation_manuelle_requise"];
      const corrections = score >= 75 ? ["fond_blanc", "recadrage_vertical", "centrage_produit", "conversion_webp"] : [];
      const { data, error } = await rpc("marketplace_image_studio_record_analysis", {
        _job_id: job.id,
        _compliance_score: score,
        _issues: issues,
        _corrections: corrections,
        _corrected_image_url: job.corrected_image_url || job.original_image_url,
        _corrected_storage_path: null,
        _thumbnail_urls: [],
        _product_detected: job.product_name || "Produit LPB",
        _ai_analysis: {
          source: "admin_simulation",
          note: "Simulation manuelle en attendant le worker IA de correction image.",
          rules: ["fond_blanc", "format_vertical", "aucun_watermark", "aucune_personne"],
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refreshAll();
      toast({ title: "Analyse Studio enregistree" });
    },
    onError: (error: Error) => toast({ title: "Analyse impossible", description: error.message, variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async (input: { jobId: string; action: "approve" | "reject" | "request_new_image" | "reprocess" }) => {
      const { data, error } = await rpc("marketplace_image_studio_review_job", {
        _job_id: input.jobId,
        _action: input.action,
        _note: adminNote.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setAdminNote("");
      refreshAll();
      toast({ title: "Decision Studio appliquee" });
    },
    onError: (error: Error) => toast({ title: "Decision impossible", description: error.message, variant: "destructive" }),
  });

  const stats = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-primary">P2.1 Studio Image Marketplace LPB</h2>
          <p className="text-cream/60">
            Controle qualite visuel officiel avant publication des images vendeurs.
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard title="Images controlees" value={stats?.total_jobs ?? 0} icon={<ImageIcon className="h-4 w-4" />} />
        <MetricCard title="En pipeline" value={stats?.in_pipeline ?? 0} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard title="A valider" value={stats?.pending_admin_review ?? 0} icon={<ShieldAlert className="h-4 w-4" />} />
        <MetricCard title="Publiees" value={stats?.published ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard title="Score moyen" value={formatScore(stats?.average_compliance_score)} icon={<ImageIcon className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="bg-noir-light/60 border border-gold/20">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="rules">Regles LPB</TabsTrigger>
          <TabsTrigger value="seller">Depot vendeur</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <Card className="bg-noir-light/40 border-gold/20">
              <CardHeader>
                <CardTitle className="text-cream">File de controle Marketplace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobsQuery.isLoading && <div className="text-cream/60">Chargement...</div>}
                {(jobsQuery.data ?? []).length === 0 && !jobsQuery.isLoading && (
                  <div className="rounded-lg border border-dashed border-gold/20 p-8 text-center text-cream/60">
                    Aucune image Marketplace dans le Studio pour le moment.
                  </div>
                )}
                {(jobsQuery.data ?? []).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedJob?.id === job.id ? "border-primary bg-primary/10" : "border-gold/10 bg-noir/30 hover:border-gold/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={job.corrected_image_url || job.original_image_url}
                        alt={job.product_name || "Image Marketplace"}
                        className="h-16 w-12 rounded bg-white object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-cream">{job.product_name || job.product_id || "Image sans produit lie"}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge className={statusClass[job.status] || "bg-muted"}>{job.status}</Badge>
                          <Badge variant="outline">{decisionLabel[job.decision] || job.decision}</Badge>
                          <Badge variant="outline">{formatScore(job.compliance_score)}</Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-noir-light/40 border-gold/20">
              <CardHeader>
                <CardTitle className="text-cream">Controle detaille</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedJob ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <ImagePreview title="Original prive" url={selectedJob.original_image_url} />
                      <ImagePreview title="Version LPB" url={selectedJob.corrected_image_url || selectedJob.published_image_url || selectedJob.original_image_url} />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm text-cream/70">
                        <span>Score de conformite</span>
                        <span>{formatScore(selectedJob.compliance_score)}</span>
                      </div>
                      <Progress value={Number(selectedJob.compliance_score ?? 0)} />
                    </div>
                    <IssueList title="Problemes detectes" items={normalizeArray(selectedJob.issues)} empty="Aucun probleme signale." />
                    <IssueList title="Corrections realisees" items={normalizeArray(selectedJob.corrections)} empty="Aucune correction appliquee." />
                    <Textarea
                      value={adminNote}
                      onChange={(event) => setAdminNote(event.target.value)}
                      placeholder="Note admin, raison du refus ou demande de nouvelle image..."
                      className="min-h-[90px]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => reviewMutation.mutate({ jobId: selectedJob.id, action: "approve" })} disabled={reviewMutation.isPending}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approuver
                      </Button>
                      <Button variant="destructive" onClick={() => reviewMutation.mutate({ jobId: selectedJob.id, action: "reject" })} disabled={reviewMutation.isPending}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Refuser
                      </Button>
                      <Button variant="outline" onClick={() => reviewMutation.mutate({ jobId: selectedJob.id, action: "request_new_image" })} disabled={reviewMutation.isPending}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Nouvelle image
                      </Button>
                      <Button variant="outline" onClick={() => reviewMutation.mutate({ jobId: selectedJob.id, action: "reprocess" })} disabled={reviewMutation.isPending}>
                        <RotateCw className="mr-2 h-4 w-4" />
                        Rejouer
                      </Button>
                    </div>
                    <div className="rounded-lg border border-gold/10 bg-noir/40 p-3">
                      <div className="mb-2 text-sm font-medium text-cream">Simulation worker IA</div>
                      <div className="flex gap-2">
                        <Input value={simulationScore} onChange={(event) => setSimulationScore(event.target.value)} />
                        <Button
                          variant="outline"
                          onClick={() => simulateAnalysisMutation.mutate(selectedJob)}
                          disabled={simulateAnalysisMutation.isPending}
                        >
                          {simulateAnalysisMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyser"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-cream/60">Selectionnez une image dans la file.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="bg-noir-light/40 border-gold/20">
            <CardHeader>
              <CardTitle className="text-cream">Standard officiel LPB</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[
                "Format vertical officiel identique au catalogue LPB",
                "Fond blanc pur #FFFFFF",
                "Produit entierement visible, centre et non deforme",
                "Meme resolution et memes marges visuelles",
                "Etiquette lisible, couleurs fideles",
                "Aucun decor, texte ajoute, watermark, QR code ou numero WhatsApp",
                "Aucune personne ni objet parasite",
                "Coffret conserve uniquement si le coffret est reellement vendu",
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2 rounded-lg border border-gold/10 bg-noir/30 p-3 text-sm text-cream/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {rule}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seller">
          <Card className="bg-noir-light/40 border-gold/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cream">
                <UploadCloud className="h-5 w-5 text-primary" />
                Soumettre une image vendeur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-cream/70">Produit lie (UUID optionnel)</label>
                  <Input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="id produit Marketplace" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-cream/70">URL de l'image originale</label>
                  <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
                </div>
              </div>
              <Button onClick={() => createJobMutation.mutate()} disabled={createJobMutation.isPending || !imageUrl.trim()}>
                {createJobMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Envoyer au controle LPB
              </Button>
              <p className="text-sm text-cream/50">
                L'image originale reste soumise au controle. Elle ne devient publique qu'apres score suffisant ou validation admin.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card className="bg-noir-light/40 border-gold/20">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-sm text-cream/55">{title}</div>
          <div className="mt-1 text-2xl font-bold text-cream">{value}</div>
        </div>
        <div className="rounded-lg bg-primary/15 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ImagePreview({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/40 p-2">
      <div className="mb-2 text-xs text-cream/55">{title}</div>
      <div className="flex aspect-[3/4] items-center justify-center rounded bg-white">
        <img src={url} alt={title} className="h-full w-full object-contain" />
      </div>
    </div>
  );
}

function IssueList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-noir/30 p-3">
      <div className="mb-2 text-sm font-medium text-cream">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-1 text-sm text-cream/70">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      ) : (
        <div className="text-sm text-cream/45">{empty}</div>
      )}
    </div>
  );
}
