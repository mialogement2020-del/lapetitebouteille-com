import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Clock } from "lucide-react";
import { usePublishedArticles } from "@/hooks/useMediaArticles";

export default function MagazineTeaser() {
  const { data: articles, isLoading } = usePublishedArticles({ limit: 3 });

  if (isLoading || !articles || articles.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="uppercase tracking-widest text-xs text-primary/80">Le Magazine</span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl">Récits & Terroirs</h2>
        </div>
        <Link
          to="/magazine"
          className="hidden md:inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          Voir tout <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
            <div className="p-4">
              {a.category?.name && (
                <span className="text-xs uppercase tracking-wider text-primary/80">{a.category.name}</span>
              )}
              <h3 className="font-serif text-lg mt-2 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {a.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {a.reading_time_minutes} min de lecture
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}