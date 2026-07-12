import { ReactNode, useEffect, useRef, useState } from "react";

interface DeferredSectionProps {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  rootMargin?: string;
  timeoutMs?: number;
}

export function DeferredSection({
  children,
  className,
  minHeight = 1,
  rootMargin = "700px 0px",
  timeoutMs = 3500,
}: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;

    const node = ref.current;
    const timer = window.setTimeout(() => setShouldRender(true), timeoutMs);

    if (!node || !("IntersectionObserver" in window)) {
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
          window.clearTimeout(timer);
        }
      },
      { rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [rootMargin, shouldRender, timeoutMs]);

  return (
    <div ref={ref} className={className} style={shouldRender ? undefined : { minHeight }}>
      {shouldRender ? children : null}
    </div>
  );
}
