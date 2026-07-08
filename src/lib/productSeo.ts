import type { Product } from "@/hooks/useProducts";

export const SITE_URL = "https://www.lapetitebouteille.com";

const FALLBACK_IMAGE = `${SITE_URL}/og-image.jpg`;

const cleanText = (value: string | null | undefined) =>
  (value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const trimToLength = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 80 ? lastSpace : trimmed.length).trim()}...`;
};

const toAbsoluteUrl = (url: string | null | undefined) => {
  if (!url) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const formatSeoPrice = (price: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(price);

const buildProductDescriptor = (product: Product) => {
  const details = [
    product.category?.name,
    product.origin_country,
    product.region,
    product.grape_variety,
    product.vintage_year ? String(product.vintage_year) : null,
  ]
    .map(cleanText)
    .filter(Boolean);

  return details.length ? details.join(" - ") : "vin et spiritueux";
};

export const buildProductTitle = (product: Product) => {
  const descriptor = buildProductDescriptor(product);
  return trimToLength(`${cleanText(product.name)} - ${descriptor} | La Petite Bouteille`, 62);
};

export const buildProductDescription = (product: Product) => {
  const base =
    cleanText(product.short_description) ||
    cleanText(product.description) ||
    `${cleanText(product.name)} disponible au Cameroun avec livraison a Yaounde, Douala et partout au pays.`;

  const parts = [
    base,
    `Prix: ${formatSeoPrice(product.price)}.`,
    product.stock_quantity > 0 ? "Produit en stock." : "Produit actuellement indisponible.",
  ];

  return trimToLength(parts.join(" "), 158);
};

export const buildProductFaq = (product: Product) => {
  const productName = cleanText(product.name);
  const categoryName = cleanText(product.category?.name) || "produit";
  return [
    {
      question: `Ou acheter ${productName} au Cameroun ?`,
      answer: `${productName} est disponible sur La Petite Bouteille, avec commande en ligne et livraison au Cameroun.`,
    },
    {
      question: `Quel est le prix de ${productName} ?`,
      answer: `Le prix affiche de ${productName} est ${formatSeoPrice(product.price)}.`,
    },
    {
      question: `${productName} est-il en stock ?`,
      answer:
        product.stock_quantity > 0
          ? `${productName} est indique en stock sur la fiche produit.`
          : `${productName} est actuellement indique hors stock sur la fiche produit.`,
    },
    {
      question: `Dans quelle categorie se trouve ${productName} ?`,
      answer: `${productName} est classe dans la categorie ${categoryName} sur La Petite Bouteille.`,
    },
  ];
};

export const buildProductSeo = (product: Product) => {
  const path = `/produit/${product.slug}`;
  const url = `${SITE_URL}${path}`;
  const image = toAbsoluteUrl(product.image_url);
  const title = buildProductTitle(product);
  const description = buildProductDescription(product);
  const faq = buildProductFaq(product);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanText(product.name),
    image,
    description,
    sku: product.id,
    url,
    category: cleanText(product.category?.name) || undefined,
    brand: product.category?.name
      ? { "@type": "Brand", name: cleanText(product.category.name) }
      : { "@type": "Brand", name: "La Petite Bouteille" },
    countryOfOrigin: cleanText(product.origin_country) || undefined,
    additionalProperty: [
      product.region
        ? { "@type": "PropertyValue", name: "Region", value: cleanText(product.region) }
        : null,
      product.grape_variety
        ? { "@type": "PropertyValue", name: "Cepage", value: cleanText(product.grape_variety) }
        : null,
      product.volume_ml
        ? { "@type": "PropertyValue", name: "Volume", value: `${product.volume_ml} ml` }
        : null,
      product.alcohol_percentage
        ? { "@type": "PropertyValue", name: "Alcool", value: `${product.alcohol_percentage}%` }
        : null,
    ].filter(Boolean),
    aggregateRating:
      product.review_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.average_rating,
            reviewCount: product.review_count,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: "XAF",
      availability:
        product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const breadcrumbSchema = {
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
      product.category
        ? {
            "@type": "ListItem",
            position: 3,
            name: cleanText(product.category.name),
            item: `${SITE_URL}/catalogue?category=${product.category.slug}`,
          }
        : null,
      {
        "@type": "ListItem",
        position: product.category ? 4 : 3,
        name: cleanText(product.name),
        item: url,
      },
    ].filter(Boolean),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return {
    title,
    description,
    path,
    canonicalUrl: url,
    image,
    faq,
    jsonLd: [productSchema, breadcrumbSchema, faqSchema],
  };
};
