import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Mail, Phone, Star, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useVendorShopBySlug, useVendorShopProducts } from "@/hooks/useVendorShop";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Seo from "@/components/seo/Seo";

const BoutiquePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: shop, isLoading } = useVendorShopBySlug(slug);
  const { data: products = [], isLoading: productsLoading } = useVendorShopProducts(shop?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-32 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-32 pb-16 container mx-auto px-4 max-w-xl text-center">
          <h1 className="font-display text-3xl text-cream mb-3">Boutique introuvable</h1>
          <Link to="/catalogue" className="text-primary underline">Voir le catalogue</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const shopUrl = `https://www.lapetitebouteille.com/boutique/${shop.slug}`;
  const shopDescription = shop.description?.slice(0, 158) || `Découvrez la boutique ${shop.name} sur La Petite Bouteille.`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: shop.name,
      description: shopDescription,
      url: shopUrl,
      image: shop.logo_url || shop.banner_url || undefined,
      address: shop.city ? {
        "@type": "PostalAddress",
        addressLocality: shop.city,
        addressCountry: shop.country || "CM",
      } : undefined,
      telephone: shop.contact_phone || undefined,
      email: shop.contact_email || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.lapetitebouteille.com/" },
        { "@type": "ListItem", position: 2, name: "Boutiques", item: "https://www.lapetitebouteille.com/catalogue" },
        { "@type": "ListItem", position: 3, name: shop.name, item: shopUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Produits de ${shop.name}`,
      itemListElement: products.slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://www.lapetitebouteille.com/produit/${product.slug}`,
        name: product.name,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-noir">
      <Seo
        title={`${shop.name} – Boutique partenaire | La Petite Bouteille`}
        description={shopDescription}
        path={`/boutique/${shop.slug}`}
        image={shop.logo_url || undefined}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="pt-20 pb-16">
        {/* Banner */}
        <div
          className="h-48 md:h-64 w-full bg-gradient-to-br from-noir-light via-noir to-noir-light relative overflow-hidden"
          style={shop.banner_url ? { backgroundImage: `url(${shop.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-noir to-transparent" />
        </div>

        <div className="container mx-auto px-4 -mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end gap-6 mb-10"
          >
            <div className="w-28 h-28 rounded-2xl bg-noir border-4 border-gold/40 overflow-hidden flex items-center justify-center shrink-0">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-3xl text-primary">{shop.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-3xl md:text-4xl text-cream">{shop.name}</h1>
                {shop.is_verified && (
                  <Badge className="bg-primary/20 text-primary border-primary/40">
                    <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Vérifié
                  </Badge>
                )}
              </div>
              <p className="text-cream/60 mt-1 max-w-2xl">{shop.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-cream/50 flex-wrap">
                {shop.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{shop.city}</span>}
                {shop.contact_email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{shop.contact_email}</span>}
                {shop.contact_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{shop.contact_phone}</span>}
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary fill-primary" />{Number(shop.trust_score).toFixed(0)}/100</span>
              </div>
            </div>
          </motion.div>

          <h2 className="font-display text-2xl text-cream mb-6">Produits</h2>
          {productsLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          ) : products.length === 0 ? (
            <p className="text-cream/50 text-center py-12">Cette boutique n'a pas encore de produits.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to={`/produit/${p.slug}`}
                  className="bg-cream/5 border border-cream/10 hover:border-primary/40 rounded-xl overflow-hidden transition-colors"
                >
                  <div className="aspect-[3/4] bg-gradient-to-b from-muted/20 to-muted/40">
                    <img
                      src={optimizeProductImage(p.image_url, { width: 320, height: 426 })}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain p-3"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm text-cream font-medium line-clamp-2">{p.name}</h3>
                    <p className="text-primary font-display font-semibold mt-1">{formatPrice(p.price)} FCFA</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BoutiquePage;
