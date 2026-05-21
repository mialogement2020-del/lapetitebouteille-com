import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/15 before:to-transparent",
        "before:animate-[shimmer_1.8s_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
