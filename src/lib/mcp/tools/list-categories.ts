import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description: "List all product categories available in the La Petite Bouteille catalogue.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await sb()
      .from("categories")
      .select("id, name, slug, description")
      .order("name");

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }

    const rows = data ?? [];
    const text = rows.length
      ? rows.map((c: any) => `- ${c.name} (/${c.slug})${c.description ? ` — ${c.description}` : ""}`).join("\n")
      : "No categories found.";

    return {
      content: [{ type: "text", text }],
      structuredContent: { count: rows.length, categories: rows },
    };
  },
});