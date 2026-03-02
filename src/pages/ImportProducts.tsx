import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ImportProducts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      // Fetch CSV from public folder
      const response = await fetch("/data/products-import.csv");
      const csvContent = await response.text();
      
      toast.info(`CSV chargé: ${csvContent.length} caractères`);

      const { data, error } = await supabase.functions.invoke("import-products", {
        body: { csvContent },
      });

      if (error) throw error;
      
      setResult(data);
      toast.success(`Import terminé: ${data.inserted} produits importés`);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-cream">Import de produits</h1>
        <p className="text-cream/60">
          Cliquez sur le bouton pour importer les produits depuis le fichier CSV.
        </p>
        <Button
          onClick={handleImport}
          disabled={loading}
          className="bg-gradient-gold text-noir font-semibold"
        >
          {loading ? "Import en cours..." : "Lancer l'import"}
        </Button>

        {result && (
          <div className="bg-cream/5 border border-gold/20 rounded-lg p-4 text-cream space-y-2">
            <p>✅ Produits importés: <strong>{result.inserted}</strong></p>
            <p>⏭️ Ignorés: <strong>{result.skipped}</strong></p>
            {result.errors?.length > 0 && (
              <div>
                <p className="text-red-400">❌ Erreurs ({result.errors.length}):</p>
                <ul className="text-xs text-red-300 max-h-40 overflow-y-auto">
                  {result.errors.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
