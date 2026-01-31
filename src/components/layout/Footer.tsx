import { Link } from "react-router-dom";
import { Wine, Facebook, Instagram, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-noir text-cream">
      {/* Newsletter Section */}
      <div className="bg-gradient-bordeaux py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="font-display text-2xl lg:text-3xl font-bold mb-4">
            Restez informé de nos <span className="text-primary">exclusivités</span>
          </h3>
          <p className="text-cream/80 mb-6 max-w-xl mx-auto">
            Inscrivez-vous à notre newsletter pour recevoir nos offres spéciales et nouveautés
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Votre email"
              className="flex-1 px-4 py-3 rounded-md bg-cream/10 border border-gold/30 text-cream placeholder:text-cream/50 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-gold text-noir font-semibold rounded-md hover:opacity-90 transition-opacity"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Wine className="h-8 w-8 text-primary" />
              <span className="font-display text-xl font-bold">
                Prestige<span className="text-primary">Vins</span>
              </span>
            </Link>
            <p className="text-cream/70 text-sm leading-relaxed mb-6">
              Votre destination premium pour les meilleurs vins, champagnes et spiritueux au Cameroun.
              Livraison rapide à Yaoundé et Douala.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-primary hover:text-noir transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-primary hover:text-noir transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-bold mb-4 text-primary">Navigation</h4>
            <ul className="space-y-3">
              {[
                { href: "/catalogue", label: "Catalogue" },
                { href: "/vins", label: "Vins" },
                { href: "/champagnes", label: "Champagnes" },
                { href: "/spiritueux", label: "Spiritueux" },
                { href: "/coffrets", label: "Coffrets Cadeaux" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="font-display text-lg font-bold mb-4 text-primary">Informations</h4>
            <ul className="space-y-3">
              {[
                { href: "/ambassadeur", label: "Devenir Ambassadeur" },
                { href: "/livraison", label: "Livraison" },
                { href: "/cgv", label: "CGV" },
                { href: "/mentions-legales", label: "Mentions Légales" },
                { href: "/contact", label: "Nous Contacter" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/70 hover:text-primary transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-bold mb-4 text-primary">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-cream/70 text-sm">
                  Yaoundé, Cameroun
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <a href="tel:+237600000000" className="text-cream/70 hover:text-primary transition-colors text-sm">
                  +237 6 00 00 00 00
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <a href="mailto:contact@prestigevins.cm" className="text-cream/70 hover:text-primary transition-colors text-sm">
                  contact@prestigevins.cm
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gold/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-cream/60">
            <p>© 2024 PrestigeVins. Tous droits réservés.</p>
            <p className="flex items-center gap-1">
              L'abus d'alcool est dangereux pour la santé. 
              <span className="text-primary font-medium">18+</span> Réservé aux adultes.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
