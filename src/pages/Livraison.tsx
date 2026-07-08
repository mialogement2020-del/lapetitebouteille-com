import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";

export default function Livraison() {
  return (
    <div className="min-h-screen bg-noir">
      <Seo
        title="Livraison au Cameroun | La Petite Bouteille"
        description="Informations de livraison de La Petite Bouteille : zones desservies, delais, frais et suivi de commande au Cameroun."
        path="/livraison"
      />
      <Header />
      <main className="pt-24 pb-16">
        <section className="container mx-auto max-w-4xl px-4 text-cream">
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-6">Livraison</h1>
          <div className="space-y-6 text-cream/70">
            <p>Nous livrons a Douala, Yaounde et dans les principales villes du Cameroun selon disponibilite logistique.</p>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Delais</h2>
              <p>Livraison express sous 24h a Douala et Yaounde pour les commandes confirmees. Les autres villes peuvent necessiter un delai additionnel.</p>
            </div>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Frais</h2>
              <p>Les frais sont calcules au moment de la commande selon la ville, le montant du panier et les options de livraison disponibles.</p>
            </div>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <h2 className="font-display text-2xl text-primary mb-3">Suivi</h2>
              <p>Utilisez la page de suivi avec votre numero de commande et votre telephone ou email de verification.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
