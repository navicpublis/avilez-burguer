import { Container, SectionHead, StarRating, Reveal } from "@/components/ui";
import { reviews } from "@/services/reviews-data";

/**
 * Reviews — avaliacoes de clientes (fundo preto).
 * Cards premium com estrelas, comentario, avatar (iniciais) e nome.
 * Avaliacoes ficticias.
 */
export function Reviews() {
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
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={Math.min(i, 3) * 60}>
              <article className="flex h-full flex-col gap-3.5 rounded-lg border border-border bg-card p-6">
                <StarRating count={r.stars} />
                <p className="flex-1 text-[0.95rem] leading-relaxed text-neutral-300">
                  “{r.text}”
                </p>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[0.85rem] font-bold text-primary-foreground">
                    {r.initials}
                  </span>
                  <span className="text-[0.92rem] font-bold text-foreground">
                    {r.name}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
