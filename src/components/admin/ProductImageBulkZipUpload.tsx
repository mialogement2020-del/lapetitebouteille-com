import { useState, useRef } from "react";
import JSZip from "jszip";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Archive, Upload, Loader2, CheckCircle2, AlertTriangle,
  FileArchive, PlayCircle, X, ShieldCheck,
} from "lucide-react";

type ManifestEntry = { product_id: string; filename: string };

type RowStatus = "ok" | "missing_file" | "missing_product" | "invalid";

interface DryRunRow {
  product_id: string;
  filename: string;
  product_name?: string;
  current_image_url?: string | null;
  size_bytes?: number;
  status: RowStatus;
  message?: string;
}

interface ExecutionRow {
  product_id: string;
  filename: string;
  status: "success" | "error";
  message?: string;
  new_url?: string;
}

const MANIFEST_NAME = "manifest.json";
const IMAGE_PREFIX = "standardized/";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ProductImageBulkZipUpload = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [zip, setZip] = useState<JSZip | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(null);
  const [dryRun, setDryRun] = useState<DryRunRow[] | null>(null);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [execResults, setExecResults] = useState<ExecutionRow[] | null>(null);

  const reset = () => {
    setZipFile(null); setZip(null); setManifest(null);
    setDryRun(null); setExecResults(null); setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseZip = async (file: File) => {
    setParsing(true);
    setZipFile(file);
    setZip(null); setManifest(null); setDryRun(null); setExecResults(null);
    try {
      const jz = await JSZip.loadAsync(file);
      const manifestFile = jz.file(MANIFEST_NAME);
      if (!manifestFile) throw new Error(`Le ZIP doit contenir ${MANIFEST_NAME} à la racine.`);
      const raw = await manifestFile.async("string");
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { throw new Error("manifest.json invalide (JSON non parsable)."); }
      if (!Array.isArray(parsed)) throw new Error("manifest.json doit être un tableau [{product_id, filename}].");
      const entries: ManifestEntry[] = [];
      for (const [i, row] of (parsed as any[]).entries()) {
        if (!row || typeof row !== "object") throw new Error(`Entrée #${i} invalide.`);
        const { product_id, filename } = row;
        if (typeof product_id !== "string" || !UUID_RE.test(product_id))
          throw new Error(`Entrée #${i}: product_id manquant ou non-UUID.`);
        if (typeof filename !== "string" || !filename)
          throw new Error(`Entrée #${i}: filename manquant.`);
        entries.push({ product_id, filename });
      }
      setZip(jz);
      setManifest(entries);
      toast({ title: "ZIP chargé", description: `${entries.length} entrées dans le manifest.` });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de lire le ZIP.",
        variant: "destructive",
      });
      reset();
    } finally {
      setParsing(false);
    }
  };

  const runDryRun = async () => {
    if (!zip || !manifest) return;
    setParsing(true);
    try {
      const ids = Array.from(new Set(manifest.map(m => m.product_id)));
      // Batch fetch products
      const products = new Map<string, { name: string; image_url: string | null }>();
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, image_url")
          .in("id", chunk);
        if (error) throw error;
        (data || []).forEach((p: any) => products.set(p.id, { name: p.name, image_url: p.image_url }));
      }

      const rows: DryRunRow[] = [];
      for (const entry of manifest) {
        const path = `${IMAGE_PREFIX}${entry.filename}`;
        const zipEntry = zip.file(path);
        const product = products.get(entry.product_id);
        if (!product) {
          rows.push({ ...entry, status: "missing_product", message: "Produit introuvable" });
          continue;
        }
        if (!zipEntry) {
          rows.push({
            ...entry, product_name: product.name,
            current_image_url: product.image_url,
            status: "missing_file", message: `Fichier absent: ${path}`,
          });
          continue;
        }
        // Size — using internal data length (approx)
        // @ts-ignore private but reliable for size
        const size = (zipEntry as any)._data?.uncompressedSize ?? 0;
        rows.push({
          ...entry,
          product_name: product.name,
          current_image_url: product.image_url,
          size_bytes: size,
          status: "ok",
        });
      }
      setDryRun(rows);
    } catch (err) {
      toast({
        title: "Erreur dry-run",
        description: err instanceof Error ? err.message : "Analyse échouée.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const execute = async () => {
    if (!zip || !dryRun) return;
    const eligible = dryRun.filter(r => r.status === "ok");
    if (eligible.length === 0) {
      toast({ title: "Rien à faire", description: "Aucune entrée valide.", variant: "destructive" });
      return;
    }
    if (!confirm(`Confirmer l'exécution: ${eligible.length} images seront uploadées et remplaceront les images existantes.`))
      return;

    setExecuting(true);
    setProgress(0);
    const results: ExecutionRow[] = [];
    const batchId = crypto.randomUUID();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    for (let i = 0; i < eligible.length; i++) {
      const row = eligible[i];
      try {
        const zipEntry = zip.file(`${IMAGE_PREFIX}${row.filename}`);
        if (!zipEntry) throw new Error("Fichier disparu du ZIP");
        const blob = await zipEntry.async("blob");
        const ext = row.filename.split(".").pop()?.toLowerCase() || "png";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : ext === "webp" ? "image/webp" : "image/png";
        const storagePath = `${row.product_id}-${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(storagePath, blob, { contentType: mime, upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(storagePath);
        const newUrl = urlData.publicUrl;

        // History (before update)
        if (userId) {
          await supabase.from("product_image_history").insert({
            product_id: row.product_id,
            previous_image_url: row.current_image_url ?? null,
            new_image_url: newUrl,
            batch_id: batchId,
            source: "bulk_zip",
            replaced_by: userId,
          });
        }

        const { error: updErr } = await supabase
          .from("products")
          .update({ image_url: newUrl })
          .eq("id", row.product_id);
        if (updErr) throw updErr;

        results.push({ product_id: row.product_id, filename: row.filename, status: "success", new_url: newUrl });
      } catch (err) {
        results.push({
          product_id: row.product_id, filename: row.filename,
          status: "error",
          message: err instanceof Error ? err.message : "Erreur inconnue",
        });
      }
      setProgress(Math.round(((i + 1) / eligible.length) * 100));
      setExecResults([...results]);
    }

    setExecuting(false);
    queryClient.invalidateQueries({ queryKey: ["products-no-image"] });
    queryClient.invalidateQueries({ queryKey: ["products-no-image-count"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const success = results.filter(r => r.status === "success").length;
    toast({
      title: "Exécution terminée",
      description: `${success}/${eligible.length} images uploadées. Batch: ${batchId.slice(0, 8)}`,
    });
  };

  const stats = dryRun ? {
    ok: dryRun.filter(r => r.status === "ok").length,
    missing_file: dryRun.filter(r => r.status === "missing_file").length,
    missing_product: dryRun.filter(r => r.status === "missing_product").length,
    with_existing: dryRun.filter(r => r.status === "ok" && r.current_image_url).length,
  } : null;

  return (
    <Card className="bg-noir/50 border-cream/10 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Import ZIP massif
          </h3>
          <p className="text-cream/60 text-sm mt-1">
            ZIP contenant <code className="text-primary">manifest.json</code> + dossier{" "}
            <code className="text-primary">standardized/</code>. Format manifest :{" "}
            <code className="text-primary">[{`{ product_id, filename }`}]</code>
          </p>
        </div>
        {zipFile && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-cream/60">
            <X className="h-4 w-4 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* Upload zone */}
      {!zipFile && (
        <div className="border-2 border-dashed border-cream/20 rounded-lg p-8 text-center">
          <FileArchive className="h-10 w-10 text-cream/30 mx-auto mb-3" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseZip(f);
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-primary-foreground"
          >
            <Upload className="h-4 w-4 mr-2" /> Choisir un fichier ZIP
          </Button>
        </div>
      )}

      {/* Loading */}
      {parsing && (
        <div className="flex items-center gap-2 text-cream/80 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Analyse en cours…
        </div>
      )}

      {/* Manifest loaded, awaiting dry-run */}
      {zipFile && manifest && !dryRun && !parsing && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Badge className="bg-cream/10 text-cream border-cream/20">{zipFile.name}</Badge>
            <span className="text-cream/60">{(zipFile.size / 1024 / 1024).toFixed(1)} MB</span>
            <Badge className="bg-primary/20 text-primary">{manifest.length} entrées</Badge>
          </div>
          <Button onClick={runDryRun} variant="outline" className="border-cream/20 text-cream">
            <ShieldCheck className="h-4 w-4 mr-2" /> Lancer le dry-run
          </Button>
        </div>
      )}

      {/* Dry-run results */}
      {dryRun && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatBadge label="Valides" value={stats.ok} tone="success" />
            <StatBadge label="Fichier absent" value={stats.missing_file} tone="warn" />
            <StatBadge label="Produit absent" value={stats.missing_product} tone="warn" />
            <StatBadge label="Remplaceront image existante" value={stats.with_existing} tone="info" />
          </div>

          {(stats.missing_file > 0 || stats.missing_product > 0) && (
            <div className="max-h-48 overflow-y-auto border border-cream/10 rounded p-2 space-y-1 text-xs">
              {dryRun.filter(r => r.status !== "ok").slice(0, 100).map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-cream/70">
                  <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  <span className="truncate">
                    <code>{r.product_id.slice(0, 8)}…</code> / {r.filename} — {r.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!execResults && !executing && (
            <Button
              onClick={execute}
              disabled={stats.ok === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Exécuter l'import réel ({stats.ok} images)
            </Button>
          )}

          {executing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-cream/60 text-xs">Upload en cours… {progress}%</p>
            </div>
          )}

          {execResults && (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {execResults.filter(r => r.status === "success").length} réussies
                </span>
                {execResults.some(r => r.status === "error") && (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {execResults.filter(r => r.status === "error").length} erreurs
                  </span>
                )}
              </div>
              {execResults.some(r => r.status === "error") && (
                <div className="max-h-48 overflow-y-auto border border-red-500/20 rounded p-2 space-y-1 text-xs">
                  {execResults.filter(r => r.status === "error").map((r, i) => (
                    <div key={i} className="text-red-300">
                      <code>{r.product_id.slice(0, 8)}…</code> / {r.filename} — {r.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const StatBadge = ({ label, value, tone }: { label: string; value: number; tone: "success" | "warn" | "info" }) => {
  const cls = tone === "success" ? "bg-green-500/10 text-green-300 border-green-500/30"
    : tone === "warn" ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
    : "bg-blue-500/10 text-blue-300 border-blue-500/30";
  return (
    <div className={`border rounded-lg p-2 text-center ${cls}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
};