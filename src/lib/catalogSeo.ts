import type { Category, Product } from "@/hooks/useProducts";

export const SITE_URL = "https://www.lapetitebouteille.com";

export const INDEXABLE_CATEGORY_SLUGS = [
  "spiritueux",
  "champagnes",
  "vins",
  "whiskies",
  "cognacs",
  "rhums",
  "coffrets",
  "aperitifs",
] as const;

export const CATEGORY_SEO_FALLBACKS: Record<string, { name: string; description: string }> = {
  spiritueux: {
    name: "Spiritueux",
    description:
      "Découvrez notre sélection de spiritueux authentiques au Cameroun : whiskies, rhums, cognacs et liqueurs, livrés à Yaoundé, Douala et partout au Cameroun.",
  },
  champagnes: {
    name: "Champagnes",
    description:
      "Achetez vos champagnes en ligne au Cameroun. Sélection premium pour cadeaux, événements et célébrations, avec livraison rapide à Yaoundé et Douala.",
  },
  vins: {
    name: "Vins",
    description:
      "Commandez des vins rouges, blancs, rosés et moelleux au Cameroun. Livraison rapide à Yaoundé, Douala et partout au pays.",
  },
  whiskies: {
    name: "Whiskies",
    description:
      "Sélection de whiskies premium, blended et single malt disponibles au Cameroun, avec paiement local sécurisé et livraison rapide.",
  },
  cognacs: {
    name: "Cognacs",
    description:
      "Cognacs et brandies de qualité disponibles en ligne au Cameroun, livrés à Yaoundé, Douala et partout au pays.",
  },
  rhums: {
    name: "Rhums",
    description:
      "Rhums blancs, ambrés et vieux rhums disponibles au Cameroun. Commande en ligne, paiement sécurisé et livraison rapide.",
  },
  coffrets: {
    name: "Coffrets cadeaux",
    description:
      "Coffrets vins, champagnes et spiritueux pour cadeaux et entreprises au Cameroun, avec livraison à Yaoundé et Douala.",
  },
  aperitifs: {
    name: "Apéritifs",
    description:
      "Apéritifs, liqueurs et boissons de réception disponibles au Cameroun avec livraison rapide et paiement Mobile Money sécurisé.",
  },
};

const cleanText = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, " ").trim();

const trimToLength = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 70 ? lastSpace : trimmed.length).trim()}...`;
};

export const getCategoryPath = (slug?: string | null) =>
  slug ? `/catalogue/${slug}` : "/catalogue";

export const getCategorySeo = (category?: Category | null, slug?: string | null) => {
  const fallback = slug ? CATEGORY_SEO_FALLBACKS[slug] : undefined;
  const name = cleanText(category?.name) || fallback?.name || "Catalogue";
  const categoryDescription = cleanText(category?.description) || fallback?.description;
  const title =
    slug && name !== "Catalogue"
      ? `${name} au Cameroun | La Petite Bouteille`
      : "Catalogue vins, champagnes et spiritueux | La Petite Bouteille";
  const description =
    categoryDescription ||
    "Achetez en ligne vins, champagnes, whiskies, rhums et spiritueux premium au Cameroun. Livraison rapide à Yaoundé, Douala et partout au Cameroun.";

  return {
    name,
    title: trimToLength(title, 62),
    description: trimToLength(description, 158),
    path: getCategoryPath(slug || category?.slug),
  };
};

export const buildCategorySchemas = ({
  category,
  slug,
  products,
  total,
}: {
  category?: Category | null;
  slug?: string | null;
  products: Product[];
  total: number;
}) => {
  const seo = getCategorySeo(category, slug);
  const url = `${SITE_URL}${seo.path}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: seo.title,
      description: seo.description,
      url,
      isPartOf: {
        "@type": "WebSite",
        name: "La Petite Bouteille",
        url: SITE_URL,
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: total,
        itemListElement: products.slice(0, 24).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/produit/${product.slug}`,
          name: product.name,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Accueil",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Catalogue",
          item: `${SITE_URL}/catalogue`,
        },
        slug
          ? {
              "@type": "ListItem",
              position: 3,
              name: seo.name,
              item: url,
            }
          : null,
      ].filter(Boolean),
    },
  ];
};
