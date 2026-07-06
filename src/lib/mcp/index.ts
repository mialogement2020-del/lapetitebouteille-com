import { defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "la-petite-bouteille-mcp",
  title: "La Petite Bouteille MCP",
  version: "0.1.0",
  instructions:
    "Tools to browse the La Petite Bouteille premium wine & spirits catalogue (Cameroon). Use `search_products` to find bottles by name, `get_product` for full details from a slug, and `list_categories` to explore the catalogue structure. Prices are in FCFA.",
  tools: [searchProducts, getProduct, listCategories],
});