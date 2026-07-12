import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  Image, Search, ExternalLink, Check, Loader2, ImageOff, Filter, Upload, Sparkles, X
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProductImageBulkZipUpload } from "./ProductImageBulkZipUpload";

interface ProductWithoutImage {
  id: string;
  name: string;
  category_id: string | null;
  is_featured: boolean | null;
  category?: { name: string } | null;
}

interface ImageState {
  url?: string;
  file?: File;
  preview?: string;
  enhancing?: boolean;
}

export const ProductImageManager = () => {
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [imageStates, setImageStates] = useState<Record<string, ImageState>>({});
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      if (searchFilter) query = query.ilike("name", `%${searchFilter}%`);
      if (categoryFilter !== "all") query = query.eq("category_id", categoryFilter);
      if (featuredOnly) query = query.eq("is_featured", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ProductWithoutImage[];
    },
  });

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

  const updateState = (id: string, patch: Partial<ImageState>) => {
    setImageStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const clearState = (id: string) => {
    setImageStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Compress image to max dimensions and return base64
  const compressImage = (file: File | Blob, maxWidth = 800, maxHeight = 1067): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file instanceof File ? file : file);
    });
  };

  // Convert file to base64 (with compression)
  const fileToBase64 = async (file: File): Promise<string> => {
    // If file > 500KB, compress it
    if (file.size > 500 * 1024) {
      const { base64 } = await compressImage(file);
      return base64;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Fetch image from URL and convert to base64 (with compression)
  const urlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const blob = await response.blob();
    if (blob.type.includes("text/html")) throw new Error("URL does not point to an image");
    // Compress if > 500KB
    if (blob.size > 500 * 1024) {
      return compressImage(blob);
    }
    const mimeType = blob.type || "image/png";
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve({ base64: result.split(",")[1], mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Upload base64 image to storage and return public URL
  const uploadToStorage = async (productId: string, base64Data: string, mimeType: string): Promise<string> => {
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const fileName = `${productId}-${Date.now()}.${ext}`;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, bytes.buffer, { contentType: mimeType, upsert: true });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // AI enhancement
  const enhanceImage = async (base64: string, mimeType: string): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("enhance-product-image", {
      body: { imageBase64: base64, mimeType },
    });
    if (error) {
      // Try to extract the actual error from the response
      if (data?.error) {
        throw new Error(data.error);
      }
      throw new Error("Le traitement IA a échoué. Vérifiez vos crédits ou réessayez plus tard.");
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    if (data?.enhanced && data?.imageBase64) return data.imageBase64;
    return null; // AI couldn't enhance, use original
  };

  // Main save mutation
  const saveImage = useMutation({
    mutationFn: async ({ productId, useAI }: { productId: string; useAI: boolean }) => {
      const state = imageStates[productId];
      if (!state) throw new Error("No image data");

      let base64: string;
      let mimeType = "image/jpeg";

      if (state.file) {
        base64 = await fileToBase64(state.file);
        mimeType = state.file.type || "image/jpeg";
      } else if (state.url) {
        // Try to fetch the image from URL
        try {
          const result = await urlToBase64(state.url);
          base64 = result.base64;
          mimeType = result.mimeType;
        } catch {
          // If CORS blocks us, just save the URL directly
          const { error } = await supabase
            .from("products")
            .update({ image_url: state.url })
            .eq("id", productId);
          if (error) throw error;
          return;
        }
      } else {
        throw new Error("No image source");
      }

      // AI enhancement if requested
      if (useAI) {
        updateState(productId, { enhancing: true });
        try {
          const enhanced = await enhanceImage(base64, mimeType);
          if (enhanced) {
            base64 = enhanced;
            mimeType = "image/png";
          }
        } finally {
          updateState(productId, { enhancing: false });
        }
      }

      // Upload to storage
      const publicUrl = await uploadToStorage(productId, base64, mimeType);

      // Update product
      const { error } = await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ["products-no-image"] });
      queryClient.invalidateQueries({ queryKey: ["products-no-image-count"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      clearState(productId);
      toast({ title: "Image enregistrée", description: "L'image du produit a été mise à jour." });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de sauvegarder l'image.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (productId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    updateState(productId, { file, preview, url: undefined });
  };

  const openVivinoSearch = (name: string) => {
    window.open(`https://www.vivino.com/search/wines?q=${encodeURIComponent(name.toLowerCase())}`, "_blank");
  };

  const openGoogleImageSearch = (name: string) => {
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} wine bottle`)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-cream flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Gestion des Images Produits
        </h2>
        <p className="text-cream/60 text-sm mt-1">
          {totalCount !== undefined && <span className="text-primary font-medium">{totalCount}</span>} produits sans image
        </p>
      </div>

      {/* Bulk ZIP upload */}
      <ProductImageBulkZipUpload />

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
          <strong>3 méthodes pour ajouter une image :</strong><br />
          🔗 <strong>URL</strong> : Collez l'adresse d'une image trouvée sur Vivino/Google<br />
          📁 <strong>Fichier local</strong> : Importez une image depuis votre appareil<br />
          ✨ <strong>AI</strong> : Cliquez sur ✨ pour améliorer automatiquement l'image (fond, netteté, dimensions)
        </p>
      </Card>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => {
            const state = imageStates[product.id] || {};
            const hasData = !!(state.url || state.file);
            const isSaving = saveImage.isPending && saveImage.variables?.productId === product.id;

            return (
              <Card key={product.id} className="bg-noir/50 border-cream/10 p-4">
                <div className="flex flex-col gap-3">
                  {/* Row 1: Product info + search buttons */}
                  <div className="flex items-center gap-3">
                    {/* Thumbnail / Preview */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-cream/5 flex items-center justify-center overflow-hidden border border-cream/10">
                      {state.preview ? (
                        <img src={state.preview} alt="Preview" className="w-full h-full object-contain" />
                      ) : state.url ? (
                        <img 
                          src={state.url} alt="Preview" className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <ImageOff className="h-5 w-5 text-cream/30" />
                      )}
                    </div>

                    {/* Product name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-cream font-medium truncate text-sm">{product.name}</p>
                        {product.is_featured && (
                          <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">⭐</Badge>
                        )}
                      </div>
                      <p className="text-cream/40 text-xs">
                        {(product.category as any)?.name || "Sans catégorie"}
                      </p>
                    </div>

                    {/* Search buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs border-cream/20 text-cream hover:bg-cream/10"
                        onClick={() => openVivinoSearch(product.name)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Vivino
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-cream/20 text-cream hover:bg-cream/10"
                        onClick={() => openGoogleImageSearch(product.name)}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Google
                      </Button>
                    </div>
                  </div>

                  {/* Row 2: URL input + file upload + actions */}
                  <div className="flex items-center gap-2">
                    {/* URL input */}
                    <Input
                      placeholder="Coller l'URL de l'image..."
                      value={state.url || ""}
                      onChange={(e) => updateState(product.id, { url: e.target.value, file: undefined, preview: undefined })}
                      className="flex-1 bg-noir/30 border-cream/20 text-cream text-xs"
                    />

                    {/* File upload */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[product.id] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(product.id, file);
                      }}
                    />
                    <Button size="icon" variant="outline"
                      className="border-cream/20 text-cream hover:bg-cream/10 flex-shrink-0"
                      onClick={() => fileInputRefs.current[product.id]?.click()}
                      title="Importer un fichier local"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>

                    {/* Clear */}
                    {hasData && (
                      <Button size="icon" variant="ghost" className="text-cream/40 hover:text-cream flex-shrink-0"
                        onClick={() => clearState(product.id)} title="Effacer">
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Save without AI */}
                    <Button
                      size="icon"
                      disabled={!hasData || isSaving}
                      onClick={() => saveImage.mutate({ productId: product.id, useAI: false })}
                      className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                      title="Sauvegarder sans amélioration AI"
                    >
                      {isSaving && !state.enhancing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Save with AI enhancement */}
                    <Button
                      size="icon"
                      disabled={!hasData || isSaving}
                      onClick={() => saveImage.mutate({ productId: product.id, useAI: true })}
                      className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
                      title="Améliorer avec AI puis sauvegarder"
                    >
                      {state.enhancing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* File name indicator */}
                  {state.file && (
                    <p className="text-cream/50 text-xs pl-1">📁 {state.file.name}</p>
                  )}
                </div>
              </Card>
            );
          })}
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
          <p className="text-cream/40 text-sm">Page {page + 1} — {products.length} résultats</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0}
              onClick={() => setPage(p => p - 1)} className="border-cream/20 text-cream">
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={products.length < pageSize}
              onClick={() => setPage(p => p + 1)} className="border-cream/20 text-cream">
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
