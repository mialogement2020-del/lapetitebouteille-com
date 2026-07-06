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
  name: "get_product",
  title: "Get product details",
  description:
    "Fetch a single product's full details by slug (e.g. from a product URL /produit/<slug>).",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Product slug from the URL."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const { data, error } = await sb()
      .from("products")
      .select(
        "id, name, slug, price, original_price, description, short_description, tasting_notes, food_pairing, grape_variety, origin_country, region, vintage_year, volume_ml, alcohol_percentage, serving_temperature, stock_quantity, image_url, average_rating, review_count",
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: `Product "${slug}" not found.` }], isError: true };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { product: data },
    };
  },
});