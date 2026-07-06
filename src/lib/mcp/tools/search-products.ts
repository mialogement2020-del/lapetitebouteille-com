import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search the La Petite Bouteille catalogue by name. Returns active products only, with price in FCFA, slug, and short description.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search term matched against product name."),
    limit: z.number().int().min(1).max(25).default(10).describe("Maximum number of results (1-25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const { data, error } = await sb()
      .from("products")
      .select("id, name, slug, price, short_description, image_url, stock_quantity")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }

    const rows = data ?? [];
    const text = rows.length
      ? rows
          .map(
            (p: any) =>
              `- ${p.name} (${p.price} FCFA) — /produit/${p.slug}${p.short_description ? ` — ${p.short_description}` : ""}`,
          )
          .join("\n")
      : `No products found for "${query}".`;

    return {
      content: [{ type: "text", text }],
      structuredContent: { count: rows.length, products: rows },
    };
  },
});