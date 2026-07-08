import { lazy, Suspense, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, User, Search, LogOut, LogIn, Users, Shield, Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useWishlist } from "@/hooks/useWishlist";
import { useCartContext } from "@/contexts/CartContext";
import { LanguageCurrencySwitcher } from "@/components/layout/LanguageCurrencySwitcher";
import { useTranslation } from "react-i18next";

const getSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);
const CartDrawer = lazy(() =>
  import("@/components/cart/CartDrawer").then((m) => ({ default: m.CartDrawer }))
);

const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { wishlistCount } = useWishlist();
  const { itemCount } = useCartContext();

  const cartButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ouvrir le panier"
      className="text-cream hover:text-primary hover:bg-cream/10 relative"
      onClick={() => {
        setIsCartLoaded(true);
        setIsCartOpen(true);
      }}
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-noir text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-gold">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Button>
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/catalogue?search=${encodeURIComponent(searchValue)}`);
      setIsSearchOpen(false);
      setSearchValue("");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if user is admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const navLinks = [
    { href: "/catalogue", label: t("nav.catalogue") },
    { href: "/catalogue?category=vins", label: t("nav.wines") },
    { href: "/catalogue?category=champagnes", label: t("nav.champagnes") },
    { href: "/catalogue?category=spiritueux", label: t("nav.spirits") },
    { href: "/suivi-commande", label: t("nav.tracking") },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? "bg-noir/95 backdrop-blur-xl border-b border-gold/10 shadow-luxury" 
          : "bg-gradient-to-b from-noir/80 to-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo - Elegant Typography */}
          <Link to="/" className="group flex items-center gap-3">
            <div 
              className="relative"
            >
              <svg className="h-10 w-10 text-primary" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 3C14 3 10 8 10 14C10 18 12 21 15 23V33H13C12 33 11 34 11 35V37H29V35C29 34 28 33 27 33H25V23C28 21 30 18 30 14C30 8 26 3 20 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M10 14C10 14 14 16 20 16C26 16 30 14 30 14" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="20" cy="10" r="2" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl lg:text-3xl font-semibold text-cream tracking-tight leading-none">
                La Petite
              </span>
              <span className="font-display text-lg lg:text-xl text-primary tracking-widest uppercase">
                Bouteille
              </span>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.href}
              >
                <Link
                  to={link.href}
                  className="relative px-4 py-2 text-cream/80 hover:text-cream transition-colors font-medium text-sm uppercase tracking-wider group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
                </Link>
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={isSearchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}
              className="p-3 text-cream/70 hover:text-cream transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Wishlist */}
            <Link to={isAuthenticated ? "/compte?tab=wishlist" : "/connexion"} aria-label="Voir la liste d'envies">
              <div
                className="p-3 text-cream/70 hover:text-cream transition-colors relative"
              >
                <Heart className="h-5 w-5" />
                                  {wishlistCount > 0 && (
                    <span
                      key={wishlistCount}
                    className="absolute top-0 right-0 bg-primary text-noir text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                            </div>
            </Link>

            {/* Cart */}
            {isCartLoaded ? (
              <Suspense fallback={cartButton}>
                <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen}>
                  {cartButton}
                </CartDrawer>
              </Suspense>
            ) : (
              cartButton
            )}

            {/* Language & Currency */}
            <LanguageCurrencySwitcher />

            {/* User Account */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Ouvrir le menu du compte"
                    className="p-3 text-cream/70 hover:text-cream transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-noir/95 backdrop-blur-xl border-gold/20 z-50 shadow-luxury">
                  <div className="px-4 py-3 border-b border-gold/10">
                    <p className="text-cream/60 text-xs truncate">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuItem 
                    className="text-cream/80 focus:text-cream focus:bg-cream/10 cursor-pointer"
                    onClick={() => navigate("/compte")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t("nav.account")}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-primary focus:text-primary focus:bg-primary/10 cursor-pointer"
                    onClick={() => navigate("/ambassadeur")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {t("nav.ambassador")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem 
                      className="text-cream/80 focus:text-cream focus:bg-cream/10 cursor-pointer"
                      onClick={() => navigate("/admin")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      {t("nav.admin")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gold/20" />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={async () => {
                      await signOut();
                      toast({ title: t("header.logoutSuccess") });
                      navigate("/");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/connexion">
                <button
                  aria-label="Se connecter"
                  className="p-3 text-cream/70 hover:text-cream transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                </button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-3 text-cream/70 hover:text-cream transition-colors"
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
                  {isSearchOpen && (
            <div
              className="overflow-hidden border-t border-gold/10"
            >
              <div className="py-6">
              <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                <Input
                  type="text"
                  placeholder={t("header.searchPlaceholder")}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 focus:border-primary h-14 text-lg rounded-full px-6 pr-14"
                  autoFocus
                />
                <Button 
                  type="submit"
                  size="icon" 
                  aria-label="Rechercher"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary hover:bg-primary/90 text-noir h-10 w-10"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </form>
              </div>
            </div>
          )}
              </div>

      {/* Mobile Menu */}
              {isMenuOpen && (
          <nav
              className="lg:hidden fixed inset-0 top-20 bg-noir/98 backdrop-blur-xl z-40"
          >
            <div className="container mx-auto px-6 py-8 h-full overflow-auto">
              <div className="space-y-2">
              {navLinks.map((link, index) => (
                <div
                  key={link.href}
                >
                  <Link
                    to={link.href}
                    className="block text-cream hover:text-primary transition-colors font-display text-3xl py-4 border-b border-gold/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
              </div>

              <div 
                className="mt-10 space-y-4"
              >
                {isAuthenticated ? (
                  <>
                    <p className="text-cream/50 text-sm truncate mb-6">{user?.email}</p>
                    <Button 
                      className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90 h-14 text-lg"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/ambassadeur");
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {t("nav.ambassador")}
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="outline"
                        className="w-full border-primary/50 text-primary hover:bg-primary/10 h-14 text-lg"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/admin");
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {t("nav.admin")}
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      className="w-full border-gold/20 text-cream hover:bg-cream/10 h-14 text-lg"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/compte");
                      }}
                    >
                      {t("nav.account")}
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 h-14 text-lg"
                      onClick={async () => {
                        await signOut();
                        toast({ title: t("header.logoutSuccess") });
                        setIsMenuOpen(false);
                        navigate("/");
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("nav.logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/connexion" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90 h-14 text-lg">
                        {t("header.signIn")}
                      </Button>
                    </Link>
                    <Link to="/inscription" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-gold/20 text-cream hover:bg-cream/10 h-14 text-lg">
                        {t("header.createAccount")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
          </header>
  );
};

export default Header;
