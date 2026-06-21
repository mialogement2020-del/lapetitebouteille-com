import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";

interface ModerationRow {
  id: string;
  product_id: string;
  quality_score: number;
  verdict: "approved" | "review" | "rejected";
  issues: string[];
  suggestions: string[];
  summary: string | null;
  counterfeit_risk: number;
  compliance_ok: boolean;
  created_at: string;
  product?: { name: string; image_url: string | null; vendor_id: string | null };
}

interface ProductRow {
  id: string;
  name: string;
  image_url: string | null;
  vendor_id: string | null;
  moderation_status: string;
  updated_at: string;
}

const verdictBadge: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  review: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ProductModerationManager() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);

  const moderationsQuery = useQuery({
    queryKey: ["product-moderations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_moderations" as any)
        .select("*, product:products(name,image_url,vendor_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ModerationRow[];
    },
  });

  const pendingQuery = useQuery({
    queryKey: ["products-pending-moderation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,image_url,vendor_id,moderation_status,updated_at")
        .not("vendor_id", "is", null)
        .in("moderation_status", ["pending", "flagged"])
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const moderate = async (productId: string) => {
    setRunning(productId);
    try {
      const { data, error } = await supabase.functions.invoke("moderate-product", {
        body: { product_id: productId },
      });
      if (error) throw error;
      const d = data as any;
      toast({
        title: `Analyse: ${d.verdict}`,
        description: `Score ${d.quality_score}/100 · contrefaçon ${d.counterfeit_risk}%`,
      });
      qc.invalidateQueries({ queryKey: ["product-moderations"] });
      qc.invalidateQueries({ queryKey: ["products-pending-moderation"] });
    } catch (e: any) {
      toast({ title: "Erreur IA", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const moderateAllPending = async () => {
    const list = pendingQuery.data ?? [];
    if (list.length === 0) return;
    setBatching(true);
    let ok = 0, fail = 0;
    for (const p of list.slice(0, 20)) {
      try {
        await supabase.functions.invoke("moderate-product", { body: { product_id: p.id } });
        ok++;
      } catch {
        fail++;
      }
    }
    setBatching(false);
    toast({ title: "Modération terminée", description: `${ok} ok, ${fail} erreurs` });
    qc.invalidateQueries({ queryKey: ["product-moderations"] });
    qc.invalidateQueries({ queryKey: ["products-pending-moderation"] });
  };

  const overrideMutation = useMutation({
    mutationFn: async (input: { product_id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("products")
        .update({ moderation_status: input.status, is_active: input.status === "approved" })
        .eq("id", input.product_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-pending-moderation"] });
      toast({ title: "Décision enregistrée" });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cream">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("adminProducts.moderation.title")}
          </CardTitle>
          <Button onClick={moderateAllPending} disabled={batching || (pendingQuery.data?.length ?? 0) === 0}>
            {batching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            t("adminProducts.moderation.analyzeAll", { count: pendingQuery.data?.length ?? 0 })
          </Button>
        </CardHeader>
        <CardContent>
          {(pendingQuery.data ?? []).length === 0 ? (
            <p className="text-cream/60 text-sm">{t("adminProducts.moderation.noPending")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingQuery.data!.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded border border-gold/10">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded bg-noir/50" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-cream truncate">{p.name}</div>
                    <Badge variant="outline">{p.moderation_status}</Badge>
                  </div>
                  <Button size="sm" onClick={() => moderate(p.id)} disabled={running === p.id}>
                    {running === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "{t("adminProducts.moderation.analyze")}"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-noir-light/40 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">{t("adminProducts.moderation.recentAnalyses")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {moderationsQuery.isLoading && <div className="text-cream/60">{t("adminProducts.moderation.loading")}</div>}
          {(moderationsQuery.data ?? []).map((m) => (
            <div key={m.id} className="p-4 rounded border border-gold/10 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  {m.product?.image_url && (
                    <img src={m.product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <div>
                    <div className="font-medium text-cream">{m.product?.name ?? m.product_id.slice(0, 8)}</div>
                    <div className="text-xs text-cream/50">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge className={verdictBadge[m.verdict]}>{m.verdict}</Badge>
                  <Badge variant="outline">Qualité {m.quality_score}/100</Badge>
                  <Badge variant="outline">Contrefaçon {m.counterfeit_risk}%</Badge>
                  {!m.compliance_ok && <Badge className="bg-red-500/15 text-red-400">Non conforme</Badge>}
                </div>
              </div>
              {m.summary && <p className="text-sm text-cream/80">{m.summary}</p>}
              {(m.issues?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-400 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> {t("adminProducts.moderation.issues")}
                  </div>
                  <ul className="text-xs text-cream/70 list-disc list-inside">
                    {m.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                  </ul>
                </div>
              )}
              {(m.suggestions?.length ?? 0) > 0 && (
                <div>
                  <div className="text-xs font-semibold text-primary">{t("adminProducts.moderation.suggestions")}</div>
                  <ul className="text-xs text-cream/70 list-disc list-inside">
                    {m.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => overrideMutation.mutate({ product_id: m.product_id, status: "approved" })}
                >
                  <ShieldCheck className="h-4 w-4 mr-1 text-emerald-400" /> {t("adminProducts.moderation.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => overrideMutation.mutate({ product_id: m.product_id, status: "rejected" })}
                >
                  <ShieldX className="h-4 w-4 mr-1 text-red-400" /> {t("adminProducts.moderation.reject")}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}