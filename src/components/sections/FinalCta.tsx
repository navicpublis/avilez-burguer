import { Container, Reveal } from "@/components/ui";
import { useShop } from "@/store/shop-context";

/**
 * FinalCta — ultima secao antes do footer (fundo preto).
 * Titulo curto de impacto + botao grande "Fazer Pedido" (abre categorias).
 */
export function FinalCta() {
  const { openCategories } = useShop();
  return (
    <section id="pedir" className="bg-background py-22 text-center text-foreground md:py-28">
      <Container>
        <Reveal>
          <h2
            className="font-condensed uppercase leading-[0.92] text-foreground"
            style={{ fontSize: "clamp(2.8rem, 12vw, 6rem)" }}
          >
            Bateu a fome?
          </h2>
          <p className="mt-3.5 text-[1.1rem] text-muted-foreground">
            Seu próximo hambúrguer favorito está a um toque.
          </p>
          <button
            type="button"
            onClick={openCategories}
            className="mt-8 inline-flex h-16 items-center justify-center gap-2.5 rounded-lg bg-primary px-10 text-[1.1rem] font-extrabold uppercase tracking-wide text-primary-foreground transition-colors duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.98]"
          >
            🍔 Fazer Pedido
          </button>
        </Reveal>
      </Container>
    </section>
  );
}
