import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-noir">
      <Seo
        title="Mentions legales | La Petite Bouteille"
        description="Mentions legales de La Petite Bouteille, cave en ligne de vins, champagnes et spiritueux au Cameroun."
        path="/mentions-legales"
      />
      <Header />
      <main className="pt-24 pb-16">
        <section className="container mx-auto max-w-4xl px-4 text-cream">
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-6">Mentions legales</h1>
          <div className="space-y-6 text-cream/70">
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Editeur</h2>
              <p>La Petite Bouteille, plateforme e-commerce specialisee dans la vente de vins, champagnes et spiritueux au Cameroun.</p>
            </div>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Contact</h2>
              <p>Email : contactlapetitebouteille@gmail.com</p>
              <p>Telephone : +237 674 069 458</p>
              <p>Adresse : Douala Bonamoussadi, Cameroun</p>
            </div>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Protection des contenus</h2>
              <p>Les textes, images, logos et marques presents sur le site sont proteges. Toute reproduction non autorisee est interdite.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
