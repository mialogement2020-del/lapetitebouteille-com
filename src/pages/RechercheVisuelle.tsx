import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Camera, Upload, Sparkles, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Seo from "@/components/seo/Seo";

type Match = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  short_description: string | null;
  similarity: number;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const RechercheVisuelle = () => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("visualSearch.tooLarge"));
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setMatches([]);
    setCaption("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("visual-search", {
        body: { image: dataUrl },
      });
      if (error) throw error;
      setCaption(data.caption ?? "");
      setMatches(data.matches ?? []);
      if (!data.matches?.length) toast.info(t("visualSearch.noResults"));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || t("visualSearch.analyzeError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title={"Recherche visuelle IA | La Petite Bouteille"} description={"Trouvez un vin ou spiritueux par photo grâce à notre recherche visuelle IA. Disponible au Cameroun."} path={"/recherche-visuelle"} />
      <Header />
      <main className="container py-12 max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" /> {t("visualSearch.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">{t("visualSearch.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("visualSearch.subtitle")}
          </p>
        </div>

        <Card className="p-8 mb-8">
          {!preview ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-1">{t("visualSearch.uploadPrompt")}</p>
              <p className="text-sm text-muted-foreground">{t("visualSearch.uploadHint")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <img src={preview} alt={t("visualSearch.preview")} className="w-full rounded-lg object-cover max-h-96" />
              <div className="space-y-4">
                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("visualSearch.analyzing")}
                  </div>
                )}
                {caption && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("visualSearch.analysisLabel")}</p>
                    <p className="text-sm leading-relaxed">{caption}</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setPreview(null); setMatches([]); setCaption(""); }}>
                  <Upload className="h-4 w-4 mr-2" /> {t("visualSearch.newImage")}
                </Button>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </Card>

        {matches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">{t("visualSearch.similarTitle")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {matches.map((m) => (
                <Link key={m.id} to={`/produit/${m.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-[3/4] bg-muted overflow-hidden">
                      {m.image_url && <img src={m.image_url} alt={m.name} className="w-full h-full object-contain p-2" loading="lazy" />}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-primary mb-1">{t("visualSearch.similar", { percent: Math.round(m.similarity * 100) })}</p>
                      <p className="font-medium text-sm line-clamp-2 mb-1">{m.name}</p>
                      <p className="text-sm font-semibold">{m.price.toLocaleString()} FCFA</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RechercheVisuelle;