import { ComponentType, lazy, Suspense, useEffect, useRef, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import Seo from "@/components/seo/Seo";
import { Link } from "react-router-dom";
import { Heart, LogIn, Menu, Search, ShoppingCart } from "lucide-react";

const AppRuntimeProviders = lazy(() =>
  import("@/components/providers/AppRuntimeProviders").then((m) => ({ default: m.AppRuntimeProviders }))
);
const Header = lazy(() => import("@/components/layout/Header"));
const Footer = lazy(() => import("@/components/layout/Footer"));
const CategoriesSection = lazy(() => import("@/components/home/CategoriesSection"));
const FeaturedProducts = lazy(() => import("@/components/home/FeaturedProducts"));
const RecommendedForYou = lazy(() => import("@/components/home/RecommendedForYou"));
const CategoryProductsSection = lazy(() => import("@/components/home/CategoryProductsSection"));
const MagazineTeaser = lazy(() => import("@/components/home/MagazineTeaser"));
const MLMTeaser = lazy(() => import("@/components/home/MLMTeaser"));

const HeaderShell = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-noir/80 to-transparent">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between h-20 lg:h-24">
        <Link to="/" className="group flex items-center gap-3">
          <svg className="h-10 w-10 text-primary" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 3C14 3 10 8 10 14C10 18 12 21 15 23V33H13C12 33 11 34 11 35V37H29V35C29 34 28 33 27 33H25V23C28 21 30 18 30 14C30 8 26 3 20 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M10 14C10 14 14 16 20 16C26 16 30 14 30 14" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="20" cy="10" r="2" fill="currentColor" opacity="0.6"/>
          </svg>
          <div className="flex flex-col">
            <span className="font-display text-2xl lg:text-3xl font-semibold text-cream tracking-tight leading-none">
              La Petite
            </span>
            <span className="font-display text-lg lg:text-xl text-primary tracking-widest uppercase">
              Bouteille
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            { href: "/catalogue", label: "Catalogue" },
            { href: "/catalogue?category=vins", label: "Vins" },
            { href: "/catalogue?category=champagnes", label: "Champagnes" },
            { href: "/catalogue?category=spiritueux", label: "Spiritueux" },
            { href: "/suivi-commande", label: "Suivi" },
          ].map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="relative px-4 py-2 text-cream/80 hover:text-cream transition-colors font-medium text-sm uppercase tracking-wider"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 lg:gap-2">
          <Link to="/catalogue" aria-label="Rechercher" className="p-3 text-cream/70 hover:text-cream transition-colors">
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/connexion" aria-label="Voir la liste d'envies" className="p-3 text-cream/70 hover:text-cream transition-colors">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/checkout" aria-label="Ouvrir le panier" className="p-3 text-cream/70 hover:text-cream transition-colors">
            <ShoppingCart className="h-5 w-5" />
          </Link>
          <Link to="/connexion" aria-label="Se connecter" className="p-3 text-cream/70 hover:text-cream transition-colors">
            <LogIn className="h-5 w-5" />
          </Link>
          <Link to="/catalogue" aria-label="Ouvrir le menu" className="lg:hidden p-3 text-cream/70 hover:text-cream transition-colors">
            <Menu className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </div>
  </header>
);

const DeferredHeader = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const show = () => setEnabled(true);
    const timer = window.setTimeout(show, 10000);
    window.addEventListener("pointerdown", show, { once: true });
    window.addEventListener("keydown", show, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("keydown", show);
    };
  }, []);

  if (!enabled) return <HeaderShell />;

  return (
    <Suspense fallback={<HeaderShell />}>
      <AppRuntimeProviders>
        <Header />
      </AppRuntimeProviders>
    </Suspense>
  );
};

interface LazyHomeSectionProps {
  component: ComponentType;
  minHeight: string;
  withRuntime?: boolean;
}

const LazyHomeSection = ({ component: Component, minHeight, withRuntime = false }: LazyHomeSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const hasUserScrolled = () => window.scrollY > 64;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasUserScrolled()) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" }
    );

    observer.observe(target);
    const revealOnScroll = () => {
      if (!hasUserScrolled()) return;
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight + 120) {
        setIsVisible(true);
        observer.disconnect();
        window.removeEventListener("scroll", revealOnScroll);
      }
    };

    window.addEventListener("scroll", revealOnScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", revealOnScroll);
    };
  }, []);

  return (
    <div ref={ref} style={{ minHeight: isVisible ? undefined : minHeight }}>
      {isVisible && (
        <Suspense fallback={<div style={{ minHeight }} />}>
          {withRuntime ? (
            <AppRuntimeProviders>
              <Component />
            </AppRuntimeProviders>
          ) : (
            <Component />
          )}
        </Suspense>
      )}
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="La Petite Bouteille - Vins & Spiritueux au Cameroun"
        description="Cave en ligne premium au Cameroun : vins, champagnes et spiritueux livres a Yaounde, Douala et partout au Cameroun. Paiement Mobile Money."
        path="/"
      />
      <DeferredHeader />
      <main>
        <HeroSection />
        <LazyHomeSection component={CategoriesSection} minHeight="520px" withRuntime />
        <LazyHomeSection component={FeaturedProducts} minHeight="680px" withRuntime />
        <LazyHomeSection component={RecommendedForYou} minHeight="420px" withRuntime />
        <LazyHomeSection component={CategoryProductsSection} minHeight="620px" withRuntime />
        <LazyHomeSection component={MagazineTeaser} minHeight="360px" withRuntime />
        <LazyHomeSection component={MLMTeaser} minHeight="620px" withRuntime />
      </main>
      <LazyHomeSection component={Footer} minHeight="640px" />
    </div>
  );
};

export default Index;
