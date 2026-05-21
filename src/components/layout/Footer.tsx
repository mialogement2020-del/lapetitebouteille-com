import { Link, useLocation } from "react-router-dom";
import { Facebook, Instagram, Phone, Mail, MapPin, Twitter, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Hide newsletter on dashboard pages (admin, ambassador, account)
  const hideNewsletter = ['/admin', '/ambassadeur', '/compte'].some(
    path => location.pathname.startsWith(path)
  );

  return (
    <footer className="bg-noir text-cream relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Newsletter Section - Hidden on dashboard pages */}
      {!hideNewsletter && (
        <div className="relative border-b border-gold/10">
          <div className="container mx-auto px-4 py-16 lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <span className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
                {t("footer.newsletterLabel")}
              </span>
              <h3 className="font-display text-3xl lg:text-4xl font-semibold mb-4">
                {t("footer.newsletter")}
              </h3>
              <p className="text-cream/60 mb-8 max-w-lg mx-auto">
                {t("footer.newsletterDesc")}
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  className="flex-1 h-14 px-6 rounded-full bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 focus:border-primary"
                />
                <Button
                  type="submit"
                  className="h-14 px-8 bg-gradient-gold text-noir font-semibold rounded-full hover:opacity-90 transition-opacity shine-effect"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t("footer.subscribe")}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16 lg:py-20 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <svg className="h-10 w-10 text-primary" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 3C14 3 10 8 10 14C10 18 12 21 15 23V33H13C12 33 11 34 11 35V37H29V35C29 34 28 33 27 33H25V23C28 21 30 18 30 14C30 8 26 3 20 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M10 14C10 14 14 16 20 16C26 16 30 14 30 14" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="20" cy="10" r="2" fill="currentColor" opacity="0.6"/>
              </svg>
              <div className="flex flex-col">
                <span className="font-display text-2xl font-semibold text-cream leading-none">
                  La Petite
                </span>
                <span className="font-display text-lg text-primary tracking-widest uppercase">
                  Bouteille
                </span>
              </div>
            </Link>
            <p className="text-cream/50 text-sm leading-relaxed mb-8">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Twitter, href: "#" },
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-xl bg-cream/5 border border-cream/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-noir transition-all duration-300"
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-cream">{t("footer.navigation")}</h4>
            <ul className="space-y-4">
              {[
                { href: "/catalogue", label: t("footer.allCollection") },
                { href: "/catalogue?category=vins", label: t("nav.wines") },
                { href: "/catalogue?category=champagnes", label: t("nav.champagnes") },
                { href: "/catalogue?category=spiritueux", label: t("nav.spirits") },
                { href: "/catalogue?category=coffrets", label: t("footer.giftBoxes") },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/50 hover:text-primary transition-colors text-sm group flex items-center gap-2"
                  >
                    <span className="w-0 h-px bg-primary transition-all group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-cream">{t("footer.information")}</h4>
            <ul className="space-y-4">
              {[
                { href: "/ambassadeur", label: t("footer.becomeAmbassador") },
                { href: "/livraison", label: t("footer.delivery") },
                { href: "/cgv", label: t("footer.terms") },
                { href: "/mentions-legales", label: t("footer.legal") },
                { href: "/contact", label: t("footer.contactUs") },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-cream/50 hover:text-primary transition-colors text-sm group flex items-center gap-2"
                  >
                    <span className="w-0 h-px bg-primary transition-all group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-cream">{t("footer.contact")}</h4>
            <ul className="space-y-5">
              <li>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-cream/50 text-sm block">{t("footer.address")}</span>
                    <span className="text-cream text-sm">Douala Bonamoussadi, Cameroun</span>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-cream/50 text-sm block">{t("footer.phone")}</span>
                    <a href="tel:+237674069458" className="text-cream hover:text-primary transition-colors text-sm">
                      +237 674 069 458
                    </a>
                  </div>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-cream/50 text-sm block">{t("footer.email")}</span>
                    <a href="mailto:contactlapetitebouteille@gmail.com" className="text-cream hover:text-primary transition-colors text-sm">
                      contactlapetitebouteille@gmail.com
                    </a>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gold/10 relative">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-cream/40">
            <p>{t("footer.rights")}</p>
            <p className="flex items-center gap-1">
              {t("footer.alcoholWarning")}
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium text-xs">18+</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
