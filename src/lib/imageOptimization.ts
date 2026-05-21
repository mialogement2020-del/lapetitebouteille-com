type ImageSize = {
  width: number;
  height?: number;
  quality?: number;
};

const storagePublicPath = "/storage/v1/object/public/product-images/";

export const optimizeProductImage = (url: string | null | undefined, size: ImageSize) => {
  if (!url) return "/placeholder.svg";

  if (url.includes(storagePublicPath)) {
    const [baseUrl, query = ""] = url.split("?");
    const [projectUrl, objectPath] = baseUrl.split(storagePublicPath);
    const params = new URLSearchParams(query);

    params.set("width", String(size.width));
    if (size.height) params.set("height", String(size.height));
    params.set("resize", "contain");
    params.set("quality", String(size.quality ?? 78));

    return `${projectUrl}/storage/v1/render/image/public/product-images/${objectPath}?${params.toString()}`;
  }

  if (url.includes("images.unsplash.com")) {
    const imageUrl = new URL(url);
    imageUrl.searchParams.set("auto", "format");
    imageUrl.searchParams.set("fit", "crop");
    imageUrl.searchParams.set("w", String(size.width));
    imageUrl.searchParams.set("q", String(size.quality ?? 78));
    return imageUrl.toString();
  }

  return url;
};