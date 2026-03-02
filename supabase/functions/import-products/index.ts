import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Category mapping from old platform IDs to new platform IDs
const CATEGORY_MAP: Record<string, string> = {
  // Vins (all wine categories)
  "9c7f5966-957f-49b8-a6b3-59a8acd58b98": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9cc2740a-2bfd-4e90-8aa1-f78a9f625dc7": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9cc2745b-c791-4f80-90af-95cfd3660fae": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9cc279bc-27be-49c8-9351-1db407e5a57d": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9cc274b7-b987-4f13-9951-ab4c8325e591": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9d2242b4-870a-4e55-8513-8910dcfefbae": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  "9cc27a3c-4563-4c13-8783-d40f259eed34": "6b646a80-569b-4279-a1b4-a46f3c30fb07",
  // Champagnes / Pétillants
  "9cc7a0d1-30cd-4750-9f83-c96e0487a7be": "73a191ec-3086-4f50-864d-821fd120bc0d",
  // Spiritueux
  "9cb03b04-ce15-4df3-8d78-9074c25e5988": "40a59a7a-1ab4-4ebf-a56a-495e39a3fdf9",
  // Coffrets
  "9cf72c65-3f81-4f66-b355-d6a5df1ad20d": "4d1f4837-8735-494e-bfa6-81c9cca8b7cd",
};

function parseCSV(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = text.split("\n");

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  let currentRow: string[] = [];
  let inQuotedField = false;
  let currentField = "";
  let fieldIndex = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!inQuotedField) {
      // Start of a new record
      currentRow = [];
      currentField = "";
      fieldIndex = 0;
    }

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = j + 1 < line.length ? line[j + 1] : "";

      if (inQuotedField) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          j++; // skip escaped quote
        } else if (char === '"') {
          inQuotedField = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"' && currentField === "") {
          inQuotedField = true;
        } else if (char === ",") {
          currentRow.push(currentField);
          currentField = "";
          fieldIndex++;
        } else {
          currentField += char;
        }
      }
    }

    if (inQuotedField) {
      // Multi-line field, add newline and continue
      currentField += "\n";
      continue;
    }

    // End of record
    currentRow.push(currentField);

    if (currentRow.length >= headers.length) {
      const record: Record<string, string> = {};
      for (let h = 0; h < headers.length; h++) {
        record[headers[h]] = currentRow[h] || "";
      }
      rows.push(record);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function extractShortDescription(description: string): string {
  // Take first meaningful sentence
  const lines = description.split("\n").filter((l) => l.trim());
  const first = lines[0] || "";
  return first.length > 200 ? first.substring(0, 197) + "..." : first;
}

function extractFieldFromDescription(
  description: string,
  field: string
): string | null {
  const regex = new RegExp(`${field}\\s*[:：]\\s*(.+)`, "i");
  const match = description.match(regex);
  return match ? match[1].trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { csvContent } = await req.json();

    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: "csvContent is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const records = parseCSV(csvContent);
    console.log(`Parsed ${records.length} records from CSV`);

    const results = { inserted: 0, skipped: 0, errors: [] as string[] };
    const usedSlugs = new Set<string>();

    // Get existing slugs to avoid duplicates
    const { data: existingProducts } = await supabase
      .from("products")
      .select("slug");
    if (existingProducts) {
      existingProducts.forEach((p: any) => usedSlugs.add(p.slug));
    }

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const productsToInsert = [];

      for (const record of batch) {
        try {
          const nom = record.nom?.trim();
          if (!nom) {
            results.skipped++;
            continue;
          }

          const oldCategoryId = record.categorie_id?.trim();
          const newCategoryId = CATEGORY_MAP[oldCategoryId] || "6b646a80-569b-4279-a1b4-a46f3c30fb07"; // default to Vins

          const description = record.description?.trim() || "";
          const prix = parseInt(record.prix) || 0;
          const stock = parseInt(record.stock) || 0;
          const isActive = record.status === "1";
          const isFeatured = record.mise_avant === "1";
          const available = record.available?.trim();

          // Generate unique slug
          let baseSlug = slugify(nom);
          let slug = baseSlug;
          let counter = 1;
          while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          usedSlugs.add(slug);

          // Extract wine details from description
          const region = extractFieldFromDescription(description, "Région");
          const cepage = extractFieldFromDescription(description, "Cépages?");
          const temperature = extractFieldFromDescription(description, "Température de [Ss]ervice");
          const origin = region?.includes("France")
            ? "France"
            : region?.includes("Italie") || region?.includes("Piémont")
            ? "Italie"
            : region?.includes("Espagne")
            ? "Espagne"
            : null;

          // Extract food pairing
          const foodPairingMatch = description.match(
            /Accords?\s+[Mm]ets[\s-]+(?:et\s+)?[Vv]ins?\s*[:：]?\s*([\s\S]*?)(?=Température|Potentiel|Conclusion|En résumé|En somme|$)/i
          );
          const foodPairing = foodPairingMatch
            ? foodPairingMatch[1].trim().substring(0, 500)
            : null;

          // Extract tasting notes
          const tastingMatch = description.match(
            /(?:Arômes?|Nez|Profil\s+Aromatique)\s*[:：]?\s*([\s\S]*?)(?=Saveurs|Accords|Bouche|$)/i
          );
          const tastingNotes = tastingMatch
            ? tastingMatch[1].trim().substring(0, 500)
            : null;

          // Determine stock quantity
          const stockQty = available === "rupture de stock" ? 0 : stock;

          productsToInsert.push({
            name: nom,
            slug,
            description: description || null,
            short_description: extractShortDescription(description) || null,
            category_id: newCategoryId,
            price: prix,
            stock_quantity: stockQty,
            is_active: isActive,
            is_featured: isFeatured,
            origin_country: origin,
            region: region?.substring(0, 100) || null,
            grape_variety: cepage?.substring(0, 100) || null,
            serving_temperature: temperature?.substring(0, 50) || null,
            tasting_notes: tastingNotes,
            food_pairing: foodPairing,
          });
        } catch (err) {
          results.errors.push(`Error processing ${record.nom}: ${err.message}`);
          results.skipped++;
        }
      }

      if (productsToInsert.length > 0) {
        const { error } = await supabase
          .from("products")
          .insert(productsToInsert);

        if (error) {
          results.errors.push(
            `Batch insert error at index ${i}: ${error.message}`
          );
          results.skipped += productsToInsert.length;
        } else {
          results.inserted += productsToInsert.length;
        }
      }
    }

    console.log(`Import complete: ${results.inserted} inserted, ${results.skipped} skipped`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
