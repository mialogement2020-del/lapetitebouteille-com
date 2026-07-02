import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, Eye, ArrowLeft, BookOpen } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";
import { useArticleBySlug } from "@/hooks/useMediaArticles";
import { Badge } from "@/components/ui/badge";

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticleBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="h-96 bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-3xl mb-2">Article introuvable</h1>
          <p className="text-muted-foreground mb-6">Cet article n'existe pas ou n'est plus disponible.</p>
          <Link to="/magazine" className="text-primary underline">Retour au magazine</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const paragraphs = article.content.split(/\n{2,}/);

  return (
    <div className="min-h-screen">
      <Seo
        title={article.seo_title || `${article.title} – Magazine LPB`}
        description={article.seo_description || article.excerpt || `Article LPB : ${article.title}`}
        path={`/magazine/${article.slug}`}
        image={article.cover_image_url || undefined}
      />
      <Header />
      <main>
        {article.cover_image_url && (
          <div className="relative w-full h-[40vh] md:h-[55vh] overflow-hidden">
            <img src={article.cover_image_url} alt={article.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}
        <article className="container mx-auto px-4 max-w-3xl -mt-24 md:-mt-32 relative pb-20">
          <Link
            to="/magazine"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au magazine
          </Link>
          {article.category?.name && (
            <span className="text-xs uppercase tracking-wider text-primary/80">{article.category.name}</span>
          )}
          <h1 className="font-serif text-3xl md:text-5xl mt-3 mb-4">{article.title}</h1>
          {article.excerpt && (
            <p className="text-lg text-muted-foreground mb-6">{article.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-6 mb-8 border-b border-border/50">
            {article.author_name && <span>Par {article.author_name}</span>}
            {article.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(article.published_at).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.reading_time_minutes} min de lecture
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.view_count}
            </span>
          </div>
          <div className="prose prose-invert max-w-none space-y-5 font-serif text-lg leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">{p}</p>
            ))}
          </div>
          {article.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border/50">
              {article.tags.map((t) => (
                <Badge key={t} variant="outline">#{t}</Badge>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}