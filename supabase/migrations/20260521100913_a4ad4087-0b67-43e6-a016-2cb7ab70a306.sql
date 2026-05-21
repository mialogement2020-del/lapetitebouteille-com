-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_source text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS products_embedding_idx
  ON public.products USING hnsw (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_products_by_embedding(
  query_embedding vector(1536),
  match_count int DEFAULT 12,
  min_similarity float DEFAULT 0.25
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  price numeric,
  image_url text,
  category_id uuid,
  short_description text,
  similarity float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.slug, p.price, p.image_url, p.category_id, p.short_description,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.products p
  WHERE p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) >= min_similarity
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Visual search history (for analytics + rate limiting)
CREATE TABLE IF NOT EXISTS public.visual_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  caption text,
  match_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visual_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own searches"
  ON public.visual_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins see all searches"
  ON public.visual_searches FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts searches"
  ON public.visual_searches FOR INSERT
  WITH CHECK (true);