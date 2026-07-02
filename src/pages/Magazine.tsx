import { Link } from "react-router-dom";
import { Calendar, Clock, Eye, BookOpen } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { usePublishedArticles, useMediaCategories } from "@/hooks/useMediaArticles";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Magazine() {
  const [category, setCategory] = useState<string | undefined>();
  const { data: articles, isLoading } = usePublishedArticles({ categorySlug: category, limit: 60 });
  const { data: categories } = useMediaCategories();

  return (
    <div className="min-h-screen">
      <Seo
        title="Magazine LPB – Vins, Guides & Art de Vivre"
        description="Découvrez le magazine La Petite Bouteille : storytelling vins, guides de dégustation, accords mets-vins et actualités premium."
        path="/magazine"
      />
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="uppercase tracking-widest text-xs text-primary/80">Le Magazine</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl mb-4">Récits, Terroirs & Art de Vivre</h1>
        <p className="text-muted-foreground max-w-2xl mb-10">
          Nos histoires soigneusement choisies pour prolonger l'expérience LPB au-delà de la bouteille.
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          <Button
            size="sm"
            variant={!category ? "default" : "outline"}
            onClick={() => setCategory(undefined)}
          >
            Tous
          </Button>
          {categories?.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={category === c.slug ? "default" : "outline"}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted/30 h-80 animate-pulse" />
            ))}
          </div>
        ) : !articles?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            Aucun article publié dans cette catégorie pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/magazine/${a.slug}`}
                className="group rounded-xl overflow-hidden border border-border/50 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {a.cover_image_url ? (
                    <img
                      src={a.cover_image_url}
                      alt={a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {a.category?.name && (
                    <span className="text-xs uppercase tracking-wider text-primary/80">{a.category.name}</span>
                  )}
                  <h2 className="font-serif text-xl mt-2 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{a.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {a.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.published_at).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.reading_time_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {a.view_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}