import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const EmbeddingsManager = () => {
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);

  const runBatch = async (force = false) => {
    setRunning(true);
    setTotal(0);
    try {
      let processed = 0;
      // Loop in batches until none left
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase.functions.invoke("embed-products", {
          body: { limit: 50, force: i === 0 ? force : false },
        });
        if (error) throw error;
        if (!data?.processed) break;
        processed += data.processed;
        setTotal(processed);
        if (data.processed < 50) break;
      }
      toast.success(`${processed} produit(s) indexé(s) pour la recherche IA`);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'indexation");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Recherche visuelle IA</h3>
          <p className="text-sm text-muted-foreground">
            Génère les empreintes sémantiques des produits pour activer la recherche par image (/recherche-visuelle).
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runBatch(false)} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Indexer les nouveaux produits
        </Button>
        <Button variant="outline" onClick={() => runBatch(true)} disabled={running}>
          Réindexer tout
        </Button>
        {running && total > 0 && (
          <span className="text-sm text-muted-foreground self-center">{total} indexés…</span>
        )}
      </div>
    </div>
  );
};