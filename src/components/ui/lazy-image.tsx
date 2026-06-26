import { forwardRef, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Mark as the LCP image — disables lazy loading and boosts fetch priority. */
  priority?: boolean;
}

/**
 * Drop-in <img> replacement with sensible perf defaults:
 * - native lazy loading + async decoding
 * - explicit width/height to reserve layout (callers should pass them)
 * - fetchpriority hint for above-the-fold images
 */
export const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(
  ({ priority, loading, decoding, fetchPriority, className, alt, ...rest }, ref) => {
    return (
      <img
        ref={ref}
        loading={priority ? "eager" : loading ?? "lazy"}
        decoding={decoding ?? "async"}
        // @ts-expect-error - fetchpriority is valid HTML, types lag
        fetchpriority={fetchPriority ?? (priority ? "high" : "auto")}
        alt={alt ?? ""}
        className={cn(className)}
        {...rest}
      />
    );
  }
);
LazyImage.displayName = "LazyImage";