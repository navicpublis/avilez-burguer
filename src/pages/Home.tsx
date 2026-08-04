import {
  Hero,
  CategorySection,
  Reviews,
  DeliveryArea,
  FinalCta,
} from "@/components/sections";
import { burgers, combos, drinks, desserts } from "@/services/menu-data";

/**
 * Home — landing page completa do site.
 * Hero + categorias (preto/amarelo) + avaliacoes + area de entrega + CTA final.
 */
export function Home() {
  return (
    <>
      <Hero />

      <CategorySection
        id="hamburgueres"
        tone="dark"
        first
        eyebrow="Cardápio"
        title={
          <>
            Nossos
            <br />
            Hambúrgueres
          </>
        }
        desc="Feitos na chapa, na hora. Escolha o seu."
        products={burgers}
      />

      <CategorySection
        id="combos"
        tone="light"
        cols3
        eyebrow="Combos"
        title={
          <>
            Monte seu
            <br />
            Combo
          </>
        }
        desc="Hambúrguer, acompanhamento e bebida por menos."
        products={combos}
      />

      <CategorySection
        id="bebidas"
        tone="dark"
        small
        eyebrow="Bebidas"
        title={
          <>
            Pra
            <br />
            Acompanhar
          </>
        }
        desc="Geladas, do jeito que a fome pede."
        products={drinks}
      />

      <CategorySection
        id="sobremesas"
        tone="light"
        cols3
        eyebrow="Sobremesas"
        title={
          <>
            Final
            <br />
            Feliz
          </>
        }
        desc="Aquele docinho pra fechar o pedido."
        products={desserts}
      />

      <Reviews />
      <DeliveryArea />
      <FinalCta />
    </>
  );
}
