import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Search, Wine, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/contexts/AuthContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { toast } from "@/hooks/use-toast";

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { href: "/catalogue", label: "Catalogue" },
    { href: "/catalogue?category=vins", label: "Vins" },
    { href: "/catalogue?category=champagnes", label: "Champagnes" },
    { href: "/catalogue?category=spiritueux", label: "Spiritueux" },
    { href: "/catalogue?category=coffrets", label: "Coffrets" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-noir/95 backdrop-blur-md border-b border-gold/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Wine className="h-8 w-8 text-primary" />
            <span className="font-display text-xl lg:text-2xl font-bold text-cream">
              Prestige<span className="text-primary">Vins</span>
            </span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-cream/80 hover:text-primary transition-colors font-medium text-sm uppercase tracking-wide"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-cream hover:text-primary hover:bg-cream/10"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <CartDrawer />

            {/* User Account */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-cream hover:text-primary hover:bg-cream/10"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-noir border-gold/30">
                  <DropdownMenuItem className="text-cream/80 focus:text-cream focus:bg-cream/10">
                    <span className="text-cream/60 text-xs truncate max-w-[180px]">
                      {user?.email}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gold/20" />
                  <DropdownMenuItem 
                    className="text-cream/80 focus:text-cream focus:bg-cream/10 cursor-pointer"
                    onClick={() => navigate("/compte")}
                  >
                    Mon compte
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-cream/80 focus:text-cream focus:bg-cream/10 cursor-pointer"
                    onClick={() => navigate("/mes-commandes")}
                  >
                    Mes commandes
                  </DropdownMenuItem>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-cream hover:text-primary hover:bg-cream/10"
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-cream hover:text-primary hover:bg-cream/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-gold/20"
            >
              <div className="py-4">
                <div className="relative max-w-xl mx-auto">
                  <Input
                    type="text"
                    placeholder="Rechercher un vin, champagne, spiritueux..."
                    className="bg-cream/10 border-gold/30 text-cream placeholder:text-cream/50 focus:border-primary pr-12"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cream/50" />
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden bg-noir border-t border-gold/20 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.href}
                    className="block text-cream/80 hover:text-primary transition-colors font-medium text-lg py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <div className="pt-4 border-t border-gold/20 space-y-3">
                {isAuthenticated ? (
                  <>
                    <p className="text-cream/60 text-sm truncate">{user?.email}</p>
                    <Button 
                      variant="outline"
                      className="w-full border-gold/30 text-cream hover:bg-cream/10"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/compte");
                      }}
                    >
                      Mon compte
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
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
                      <Button className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90">
                        Se connecter
                      </Button>
                    </Link>
                    <Link to="/inscription" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-gold/30 text-cream hover:bg-cream/10">
                        Créer un compte
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
