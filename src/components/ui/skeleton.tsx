import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/60 bg-[length:200%_100%] animate-shimmer",
        "bg-gradient-to-r from-muted/60 via-primary/10 to-muted/60",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
