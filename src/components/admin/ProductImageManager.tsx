import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Image, 
  Search, 
  ExternalLink, 
  Check, 
  Loader2, 
  ImageOff,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductWithoutImage {
  id: string;
  name: string;
  category_id: string | null;
  is_featured: boolean | null;
  category?: { name: string } | null;
}

export const ProductImageManager = () => {
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Fetch products without images
  const { data: products, isLoading } = useQuery({
    queryKey: ["products-no-image", searchFilter, categoryFilter, featuredOnly, page],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, category_id, is_featured, category:categories(name)")
        .is("image_url", null)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (searchFilter) {
        query = query.ilike("name", `%${searchFilter}%`);
      }
      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }
      if (featuredOnly) {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ProductWithoutImage[];
    },
  });

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["products-no-image-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("image_url", null)
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ["admin-categories-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Save image URL mutation
  const saveImage = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["products-no-image"] });
      queryClient.invalidateQueries({ queryKey: ["products-no-image-count"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setImageUrls(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      toast({
        title: "Image enregistrée",
        description: "L'image du produit a été mise à jour.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'image.",
        variant: "destructive",
      });
    },
  });

  const openVivinoSearch = (productName: string) => {
    const query = encodeURIComponent(productName.toLowerCase());
    window.open(`https://www.vivino.com/search/wines?q=${query}`, "_blank");
  };

  const openGoogleImageSearch = (productName: string) => {
    const query = encodeURIComponent(`${productName} wine bottle`);
    window.open(`https://www.google.com/search?tbm=isch&q=${query}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cream flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Gestion des Images Produits
          </h2>
          <p className="text-cream/60 text-sm mt-1">
            {totalCount !== undefined && (
              <span className="text-primary font-medium">{totalCount}</span>
            )} produits sans image
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchFilter}
            onChange={(e) => { setSearchFilter(e.target.value); setPage(0); }}
            className="pl-10 bg-noir/50 border-cream/20 text-cream"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] bg-noir/50 border-cream/20 text-cream">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={featuredOnly ? "default" : "outline"}
          size="sm"
          onClick={() => { setFeaturedOnly(!featuredOnly); setPage(0); }}
          className={featuredOnly ? "bg-primary text-primary-foreground" : "border-cream/20 text-cream"}
        >
          ⭐ Mis en avant
        </Button>
      </div>

      {/* Instructions */}
      <Card className="bg-primary/5 border-primary/20 p-4">
        <p className="text-cream/80 text-sm">
          <strong>Comment ajouter une image :</strong> Cliquez sur "Vivino" ou "Google" pour rechercher 
          l'image du produit, faites un clic droit sur l'image → "Copier l'adresse de l'image", 
          puis collez-la dans le champ URL et cliquez sur ✓.
        </p>
      </Card>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="bg-noir/50 border-cream/10 p-4">
              <div className="flex items-center gap-4">
                {/* Product info */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-cream/5 flex items-center justify-center">
                  <ImageOff className="h-5 w-5 text-cream/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-cream font-medium truncate">{product.name}</p>
                    {product.is_featured && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                        ⭐ Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-cream/40 text-xs">
                    {(product.category as any)?.name || "Sans catégorie"}
                  </p>
                </div>

                {/* Search buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-cream/20 text-cream hover:bg-cream/10"
                    onClick={() => openVivinoSearch(product.name)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Vivino
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-cream/20 text-cream hover:bg-cream/10"
                    onClick={() => openGoogleImageSearch(product.name)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Google
                  </Button>
                </div>

                {/* URL input */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input
                    placeholder="Coller l'URL de l'image..."
                    value={imageUrls[product.id] || ""}
                    onChange={(e) => setImageUrls(prev => ({ ...prev, [product.id]: e.target.value }))}
                    className="w-[280px] bg-noir/30 border-cream/20 text-cream text-xs"
                  />
                  <Button
                    size="icon"
                    disabled={!imageUrls[product.id] || saveImage.isPending}
                    onClick={() => {
                      const url = imageUrls[product.id];
                      if (url) saveImage.mutate({ productId: product.id, imageUrl: url });
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                  >
                    {saveImage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Preview */}
                {imageUrls[product.id] && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-cream/20 flex-shrink-0">
                    <img
                      src={imageUrls[product.id]}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Image className="h-12 w-12 text-cream/20 mx-auto mb-3" />
          <p className="text-cream/60">Aucun produit sans image trouvé</p>
        </div>
      )}

      {/* Pagination */}
      {products && products.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-cream/40 text-sm">
            Page {page + 1} — {products.length} résultats affichés
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="border-cream/20 text-cream"
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={products.length < pageSize}
              onClick={() => setPage(p => p + 1)}
              className="border-cream/20 text-cream"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
