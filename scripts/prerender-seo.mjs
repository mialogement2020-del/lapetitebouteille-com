import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.lapetitebouteille.com";
const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const PUBLIC_DIR = path.join(ROOT, "public");
const INDEX_HTML = path.join(DIST_DIR, "index.html");
const MAX_PRERENDERED_PRODUCTS = Number(process.env.PRERENDER_PRODUCT_LIMIT || 80);

const staticRoutes = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/catalogue", changefreq: "daily", priority: "0.9" },
  { loc: "/ambassadeur", changefreq: "monthly", priority: "0.7" },
  { loc: "/grossiste", changefreq: "monthly", priority: "0.7" },
  { loc: "/comparer", changefreq: "monthly", priority: "0.5" },
  { loc: "/recherche-visuelle", changefreq: "monthly", priority: "0.5" },
  { loc: "/suivi-commande", changefreq: "monthly", priority: "0.4" },
  { loc: "/inscription", changefreq: "yearly", priority: "0.3" },
  { loc: "/connexion", changefreq: "yearly", priority: "0.3" },
  { loc: "/conditions", changefreq: "yearly", priority: "0.3" },
  { loc: "/confidentialite", changefreq: "yearly", priority: "0.3" },
  { loc: "/livraison", changefreq: "yearly", priority: "0.3" },
  { loc: "/mentions-legales", changefreq: "yearly", priority: "0.3" },
  { loc: "/contact", changefreq: "yearly", priority: "0.3" },
];

const priorityCategorySlugs = [
  "spiritueux",
  "champagnes",
  "vins",
  "whiskies",
  "cognacs",
  "rhums",
  "coffrets",
  "aperitifs",
];

const categoryFallbacks = {
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const escapeXml = (value) =>
  escapeHtml(value).replace(/'/g, "&apos;");

const cleanText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const trimToLength = (value, maxLength) => {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  return `${trimmed.slice(0, lastSpace > 70 ? lastSpace : trimmed.length).trim()}...`;
};

const toAbsoluteUrl = (url) => {
  if (!url) return `${SITE_URL}/og-image.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

const readEnv = async () => {
  try {
    const content = await readFile(path.join(ROOT, ".env"), "utf8");
    return Object.fromEntries(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const [key, ...rest] = line.split("=");
          return [key, rest.join("=").replace(/^"|"$/g, "")];
        })
    );
  } catch {
    return {};
  }
};

const getSupabaseConfig = async () => {
  const env = await readEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  return { supabaseUrl, supabaseKey };
};

const supabaseFetch = async (table, params) => {
  const { supabaseUrl, supabaseKey } = await getSupabaseConfig();
  const endpoint = new URL(`${supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => endpoint.searchParams.set(key, value));

  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${table}: ${response.status}`);
  }

  return response.json();
};

const fetchCategories = () =>
  supabaseFetch("categories", {
    select: "id,name,slug,description,image_url,display_order,parent_id,updated_at,created_at",
    is_active: "eq.true",
    order: "display_order.asc",
  });

const fetchProducts = async () => {
  try {
    return await supabaseFetch("public_products", {
      select:
        "id,name,slug,description,short_description,category_id,price,original_price,stock_quantity,is_active,is_featured,alcohol_percentage,volume_ml,origin_country,region,grape_variety,vintage_year,tasting_notes,food_pairing,serving_temperature,image_url,gallery_urls,average_rating,review_count,created_at,updated_at",
      is_active: "eq.true",
      order: "is_featured.desc,review_count.desc,created_at.desc",
    });
  } catch (error) {
    console.warn(
      `Skipping product prerender because public_products is unavailable: ${error.message}`
    );
    return [];
  }
};

const formatPrice = (price) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(price || 0));

const buildCategorySeo = (category, slug) => {
  const fallback = categoryFallbacks[slug] || {};
  const name = cleanText(category?.name) || fallback.name || "Catalogue";
  const adminDescription = cleanText(category?.description);
  const description =
    adminDescription.length >= 80
      ? adminDescription
      : fallback.description ||
    "Achetez en ligne vins, champagnes, whiskies, rhums et spiritueux premium au Cameroun. Livraison rapide à Yaoundé, Douala et partout au Cameroun.";
  const path = slug ? `/catalogue/${slug}` : "/catalogue";

  return {
    path,
    name,
    title: trimToLength(
      slug ? `${name} au Cameroun | La Petite Bouteille` : "Catalogue vins, champagnes et spiritueux | La Petite Bouteille",
      62
    ),
    description: trimToLength(description, 158),
    image: `${SITE_URL}/og-image.jpg`,
  };
};

const buildProductSeo = (product) => {
  const categoryName = cleanText(product.category?.name) || "vin et spiritueux";
  const descriptor = [categoryName, product.origin_country, product.region, product.grape_variety]
    .map(cleanText)
    .filter(Boolean)
    .join(" - ");
  const baseDescription =
    cleanText(product.short_description) ||
    cleanText(product.description) ||
    `${cleanText(product.name)} disponible au Cameroun avec livraison à Yaoundé, Douala et partout au pays.`;
  const stock = Number(product.stock_quantity || 0) > 0 ? "Produit en stock." : "Produit actuellement indisponible.";

  return {
    path: `/produit/${product.slug}`,
    name: cleanText(product.name),
    title: trimToLength(`${cleanText(product.name)} - ${descriptor || categoryName} | La Petite Bouteille`, 62),
    description: trimToLength(`${baseDescription} Prix: ${formatPrice(product.price)}. ${stock}`, 158),
    image: toAbsoluteUrl(product.image_url),
  };
};

const breadcrumbSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

const categorySchemas = (seo, products, total) => [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    description: seo.description,
    url: `${SITE_URL}${seo.path}`,
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
        name: cleanText(product.name),
      })),
    },
  },
  breadcrumbSchema([
    { name: "Accueil", path: "/" },
    { name: "Catalogue", path: "/catalogue" },
    { name: seo.name, path: seo.path },
  ]),
];

const productSchemas = (seo, product) => [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seo.name,
    image: seo.image,
    description: seo.description,
    sku: product.id,
    url: `${SITE_URL}${seo.path}`,
    category: cleanText(product.category?.name) || undefined,
    brand: { "@type": "Brand", name: "La Petite Bouteille" },
    countryOfOrigin: cleanText(product.origin_country) || undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${seo.path}`,
      price: Number(product.price || 0),
      priceCurrency: "XAF",
      availability:
        Number(product.stock_quantity || 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      Number(product.review_count || 0) > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.average_rating || 0),
            reviewCount: Number(product.review_count || 0),
          }
        : undefined,
  },
  breadcrumbSchema([
    { name: "Accueil", path: "/" },
    { name: "Catalogue", path: "/catalogue" },
    product.category?.slug
      ? { name: cleanText(product.category.name), path: `/catalogue/${product.category.slug}` }
      : null,
    { name: seo.name, path: seo.path },
  ].filter(Boolean)),
];

const renderHead = ({ seo, type, schemas }) => {
  const url = `${SITE_URL}${seo.path}`;
  const jsonLd = schemas
    .map(
      (schema) =>
        `<script type="application/ld+json" data-prerender-seo>${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`
    )
    .join("\n    ");

  return `<!-- Prerendered SEO: ${seo.path} -->
    <title>${escapeHtml(seo.title)}</title>
    <meta name="title" content="${escapeHtml(seo.title)}" />
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(seo.image)}" />
    <meta property="og:site_name" content="La Petite Bouteille" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${escapeHtml(seo.image)}" />
    ${jsonLd}`;
};

const injectSeo = (template, payload) => {
  const withoutExisting = template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name=["']title["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, "");

  return withoutExisting.replace("</head>", `    ${renderHead(payload)}\n  </head>`);
};

const writeRouteHtml = async (routePath, html) => {
  const normalized = routePath === "/" ? "index.html" : path.join(routePath.slice(1), "index.html");
  const outputPath = path.join(DIST_DIR, normalized);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
};

const toUrlEntry = ({ loc, changefreq, priority, lastmod }) =>
  [
    `  <url>`,
    `    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `  </url>`,
  ]
    .filter(Boolean)
    .join("\n");

const writeSitemap = async ({ categories, products }) => {
  const categoryRoutes = categories.map((category) => ({
    loc: `/catalogue/${category.slug}`,
    lastmod: category.updated_at || category.created_at
      ? new Date(category.updated_at || category.created_at).toISOString().slice(0, 10)
      : undefined,
    changefreq: "daily",
    priority: priorityCategorySlugs.includes(category.slug) ? "0.9" : "0.7",
  }));

  const productRoutes = products
    .filter((product) => product.slug)
    .map((product) => ({
      loc: `/produit/${product.slug}`,
      lastmod: new Date(product.updated_at || product.created_at).toISOString().slice(0, 10),
      changefreq: "weekly",
      priority: "0.8",
    }));

  const sitemap = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...staticRoutes.map(toUrlEntry),
    ...categoryRoutes.map(toUrlEntry),
    ...productRoutes.map(toUrlEntry),
    `</urlset>`,
    ``,
  ].join("\n");

  await writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf8");
  return staticRoutes.length + categoryRoutes.length + productRoutes.length;
};

const main = async () => {
  const [template, fetchedCategories, fetchedProducts] = await Promise.all([
    readFile(INDEX_HTML, "utf8"),
    fetchCategories(),
    fetchProducts(),
  ]);

  const categoryMap = new Map(
    fetchedCategories.filter((category) => category.slug).map((category) => [category.slug, category])
  );
  const categories = Array.from(
    new Map(
      [
        ...priorityCategorySlugs.map((slug) => [slug, categoryMap.get(slug) || { slug }]),
        ...fetchedCategories.filter((category) => category.slug).map((category) => [category.slug, category]),
      ]
    ).values()
  );
  const products = fetchedProducts.filter((product) => product.slug);
  const categoryById = new Map(fetchedCategories.map((category) => [category.id, category]));
  for (const product of products) {
    product.category = product.category_id ? categoryById.get(product.category_id) || null : null;
  }
  const childCategoryIdsByParent = fetchedCategories.reduce((map, category) => {
    if (!category.parent_id) return map;
    const children = map.get(category.parent_id) || [];
    children.push(category.id);
    map.set(category.parent_id, children);
    return map;
  }, new Map());
  const getCategoryProductIds = (category) =>
    new Set([category.id, ...(childCategoryIdsByParent.get(category.id) || [])].filter(Boolean));

  const categoryRoutes = categories
    .filter((category) => priorityCategorySlugs.includes(category.slug))
    .map((category) => {
      const seo = buildCategorySeo(category, category.slug);
      const categoryIds = getCategoryProductIds(category);
      const categoryProducts = products.filter(
        (product) => product.category?.slug === category.slug || categoryIds.has(product.category_id)
      );
      return {
        seo,
        html: injectSeo(template, {
          seo,
          type: "website",
          schemas: categorySchemas(seo, categoryProducts, categoryProducts.length),
        }),
      };
    });

  const productRoutes = products
    .slice(0, MAX_PRERENDERED_PRODUCTS)
    .map((product) => {
      const seo = buildProductSeo(product);
      return {
        seo,
        html: injectSeo(template, {
          seo,
          type: "product",
          schemas: productSchemas(seo, product),
        }),
      };
    });

  await Promise.all([
    ...categoryRoutes.map((route) => writeRouteHtml(route.seo.path, route.html)),
    ...productRoutes.map((route) => writeRouteHtml(route.seo.path, route.html)),
  ]);

  const sitemapCount = await writeSitemap({ categories, products });

  console.log(
    `Prerendered ${categoryRoutes.length} category pages and ${productRoutes.length} product pages. Sitemap: ${sitemapCount} URLs.`
  );
};

await main();
