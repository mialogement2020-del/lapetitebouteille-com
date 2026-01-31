import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, User, Search, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { href: "/catalogue", label: "Catalogue" },
    { href: "/vins", label: "Vins" },
    { href: "/champagnes", label: "Champagnes" },
    { href: "/spiritueux", label: "Spiritueux" },
    { href: "/coffrets", label: "Coffrets" },
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
            <Button
              variant="ghost"
              size="icon"
              className="text-cream hover:text-primary hover:bg-cream/10 relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-primary text-noir text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                0
              </span>
            </Button>

            {/* User Account */}
            <Button
              variant="ghost"
              size="icon"
              className="text-cream hover:text-primary hover:bg-cream/10"
            >
              <User className="h-5 w-5" />
            </Button>

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
              <div className="pt-4 border-t border-gold/20">
                <Button className="w-full bg-gradient-gold text-noir font-semibold hover:opacity-90">
                  Devenir Ambassadeur
                </Button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
