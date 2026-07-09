import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.lapetitebouteille.com";
const ROOT = process.cwd();

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

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const readEnv = async () => {
  const envPath = path.join(ROOT, ".env");
  const content = await readFile(envPath, "utf8");
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
};

const fetchProducts = async () => {
  const env = await readEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  const endpoint = new URL(`${supabaseUrl}/rest/v1/products`);
  endpoint.searchParams.set("select", "slug,updated_at,created_at");
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "updated_at.desc");

  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products for sitemap: ${response.status}`);
  }

  return response.json();
};

const fetchCategories = async () => {
  const env = await readEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  const endpoint = new URL(`${supabaseUrl}/rest/v1/categories`);
  endpoint.searchParams.set("select", "slug,updated_at,created_at");
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "display_order.asc");

  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    console.warn(`Skipping categories in sitemap: ${response.status}`);
    return [];
  }

  return response.json();
};

const toUrlEntry = ({ loc, changefreq, priority, lastmod }) => {
  const rows = [
    `  <url>`,
    `    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    `  </url>`,
  ].filter(Boolean);

  return rows.join("\n");
};

const products = await fetchProducts();
const categories = await fetchCategories();
const categoryRoutes = Array.from(
  new Map(
    [
      ...priorityCategorySlugs.map((slug) => [slug, { slug }]),
      ...categories.filter((category) => category.slug).map((category) => [category.slug, category]),
    ]
  ).values()
).map((category) => ({
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

await writeFile(path.join(ROOT, "public", "sitemap.xml"), sitemap, "utf8");
console.log(`Generated sitemap.xml with ${staticRoutes.length + categoryRoutes.length + productRoutes.length} URLs.`);
