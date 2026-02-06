import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Search, LogOut, LogIn, Users, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/useWishlist";

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { wishlistCount } = useWishlist();

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
    { href: "/catalogue", label: "Catalogue" },
    { href: "/catalogue?category=vins", label: "Vins" },
    { href: "/catalogue?category=champagnes", label: "Champagnes" },
    { href: "/catalogue?category=spiritueux", label: "Spiritueux" },
    { href: "/suivi-commande", label: "Suivi" },
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
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <svg className="h-10 w-10 text-primary" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 3C14 3 10 8 10 14C10 18 12 21 15 23V33H13C12 33 11 34 11 35V37H29V35C29 34 28 33 27 33H25V23C28 21 30 18 30 14C30 8 26 3 20 3Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M10 14C10 14 14 16 20 16C26 16 30 14 30 14" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="20" cy="10" r="2" fill="currentColor" opacity="0.6"/>
              </svg>
            </motion.div>
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
              <motion.div
                key={link.href}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  to={link.href}
                  className="relative px-4 py-2 text-cream/80 hover:text-cream transition-colors font-medium text-sm uppercase tracking-wider group"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-3/4" />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Search Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-3 text-cream/70 hover:text-cream transition-colors"
            >
              <Search className="h-5 w-5" />
            </motion.button>

            {/* Wishlist */}
            <Link to={isAuthenticated ? "/compte?tab=wishlist" : "/connexion"}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 text-cream/70 hover:text-cream transition-colors relative"
              >
                <Heart className="h-5 w-5" />
                <AnimatePresence mode="wait">
                  {wishlistCount > 0 && (
                    <motion.span
                      key={wishlistCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="absolute top-0 right-0 bg-primary text-noir text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </motion.span>
                  )}
                </AnimatePresence>
            </motion.div>
            </Link>

            {/* Cart */}
            <CartDrawer />

            {/* User Account */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 text-cream/70 hover:text-cream transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </motion.button>
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
                    Mon Compte
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-primary focus:text-primary focus:bg-primary/10 cursor-pointer"
                    onClick={() => navigate("/ambassadeur")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Espace Ambassadeur
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem 
                      className="text-cream/80 focus:text-cream focus:bg-cream/10 cursor-pointer"
                      onClick={() => navigate("/admin")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gold/20" />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={async () => {
                      await signOut();
                      toast({ title: "Déconnexion réussie" });
                      navigate("/");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/connexion">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-3 text-cream/70 hover:text-cream transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="lg:hidden p-3 text-cream/70 hover:text-cream transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden border-t border-gold/10"
            >
              <div className="py-6">
                <div className="relative max-w-2xl mx-auto">
                  <Input
                    type="text"
                    placeholder="Rechercher un vin, champagne, spiritueux..."
                    className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 focus:border-primary h-14 text-lg rounded-full px-6 pr-14"
                    autoFocus
                  />
                  <Button 
                    size="icon" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-primary hover:bg-primary/90 text-noir h-10 w-10"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed inset-0 top-20 bg-noir/98 backdrop-blur-xl z-40"
          >
            <div className="container mx-auto px-6 py-8 h-full overflow-auto">
              <div className="space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={link.href}
                    className="block text-cream hover:text-primary transition-colors font-display text-3xl py-4 border-b border-gold/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
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
                      Espace Ambassadeur
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
                        Administration
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
                      Mon compte
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 h-14 text-lg"
                      onClick={async () => {
                        await signOut();
                        toast({ title: "Déconnexion réussie" });
                        setIsMenuOpen(false);
                        navigate("/");
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Se déconnecter
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/connexion" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90 h-14 text-lg">
                        Se connecter
                      </Button>
                    </Link>
                    <Link to="/inscription" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-gold/20 text-cream hover:bg-cream/10 h-14 text-lg">
                        Créer un compte
                      </Button>
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
