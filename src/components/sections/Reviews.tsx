import { Container, SectionHead, StarRating, Reveal } from "@/components/ui";
import { useApprovedReviews } from "@/hooks";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AB";
}

/**
 * Reviews — avaliações APROVADAS pela moderação (fonte: reviews-store).
 * Se ainda não há avaliações aprovadas, a seção não aparece.
 */
export function Reviews() {
  const reviews = useApprovedReviews();
  if (reviews.length === 0) return null;

  return (
    <section id="avaliacoes" className="bg-background py-18 text-foreground md:py-24">
      <Container>
        <SectionHead
          eyebrow="Avaliações"
          title={
            <>
              Quem prova,
              <br />
              volta
            </>
          }
          desc="O que a galera fala da Avilez Burguer."
          tone="dark"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {reviews.slice(0, 6).map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i, 3) * 60}>
              <article className="flex h-full flex-col gap-3.5 rounded-lg border border-border bg-card p-6">
                <StarRating count={r.rating} />
                <p className="flex-1 text-[0.95rem] leading-relaxed text-neutral-300">
                  “{r.comment}”
                </p>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[0.85rem] font-bold text-primary-foreground">
                    {initialsOf(r.name)}
                  </span>
                  <span className="text-[0.92rem] font-bold text-foreground">{r.name}</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
