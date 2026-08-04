import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Container, SectionHead, ProductCard, Reveal } from "@/components/ui";
import type { Product } from "@/services/menu-data";
import { useShop } from "@/store/shop-context";

interface CategorySectionProps {
  id: string;
  tone: "dark" | "light";
  eyebrow: string;
  title: ReactNode;
  desc: string;
  products: Product[];
  /** Cards menores (bebidas). */
  small?: boolean;
  /** Grid de 3 colunas no desktop (combos/sobremesas) em vez de 4. */
  cols3?: boolean;
  /** Emenda com a Hero/secao anterior (sem corte no topo). */
  first?: boolean;
}

/**
 * CategorySection — bloco de categoria da landing.
 * Alterna tema preto/amarelo, cabecalho forte e grid de produtos
 * (2 col mobile / 3 tablet / 4 desktop; ou 3 no desktop para combos).
 * Cada item entra com fade-up escalonado.
 */
export function CategorySection({
  id,
  tone,
  eyebrow,
  title,
  desc,
  products,
  small = false,
  cols3 = false,
  first = false,
}: CategorySectionProps) {
  const { openProduct } = useShop();
  return (
    <section
      id={id}
      className={cn(
        "relative py-18 md:py-24",
        tone === "dark" ? "bg-background text-foreground" : "bg-primary text-brand-ink",
        first && "-mt-px pt-10"
      )}
    >
      <Container>
        <SectionHead eyebrow={eyebrow} title={title} desc={desc} tone={tone} />
        <div
          className={cn(
            "grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5",
            cols3 ? "lg:max-w-4xl lg:grid-cols-3" : "lg:grid-cols-4 lg:gap-6"
          )}
        >
          {products.map((p, i) => (
            <Reveal key={p.name} delay={Math.min(i, 3) * 60}>
              <ProductCard product={p} small={small} onSelect={openProduct} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
