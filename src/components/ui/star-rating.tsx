import { Star } from "lucide-react";

/** Estrelas de avaliacao (cheias, na cor de marca). */
export function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} de 5 estrelas`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="size-[1.05rem] fill-primary text-primary" />
      ))}
    </div>
  );
}
