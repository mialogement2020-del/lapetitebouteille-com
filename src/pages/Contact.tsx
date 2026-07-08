import { Mail, MapPin, Phone } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Seo from "@/components/seo/Seo";

export default function Contact() {
  return (
    <div className="min-h-screen bg-noir">
      <Seo
        title="Contact | La Petite Bouteille"
        description="Contactez La Petite Bouteille pour vos commandes de vins, champagnes et spiritueux au Cameroun."
        path="/contact"
      />
      <Header />
      <main className="pt-24 pb-16">
        <section className="container mx-auto max-w-4xl px-4 text-cream">
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-6">Contact</h1>
          <p className="text-cream/70 mb-8">Notre equipe vous accompagne pour vos commandes, demandes grossistes et questions de livraison.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <a className="rounded-xl border border-cream/10 bg-cream/5 p-6 hover:border-primary/40 transition-colors" href="tel:+237674069458">
              <Phone className="h-6 w-6 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Telephone</h2>
              <p className="text-cream/70">+237 674 069 458</p>
            </a>
            <a className="rounded-xl border border-cream/10 bg-cream/5 p-6 hover:border-primary/40 transition-colors" href="mailto:contactlapetitebouteille@gmail.com">
              <Mail className="h-6 w-6 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Email</h2>
              <p className="text-cream/70 break-words">contactlapetitebouteille@gmail.com</p>
            </a>
            <div className="rounded-xl border border-cream/10 bg-cream/5 p-6">
              <MapPin className="h-6 w-6 text-primary mb-4" />
              <h2 className="font-display text-xl mb-2">Adresse</h2>
              <p className="text-cream/70">Douala Bonamoussadi, Cameroun</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
