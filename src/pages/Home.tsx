import {
  Hero,
  CategorySection,
  Reviews,
  DeliveryArea,
  Localizacao,
  FinalCta,
} from "@/components/sections";
import { StoreClosedBanner } from "@/components/sections/StoreClosedBanner";
import { useSettings, useMenuSections } from "@/hooks";

/**
 * Home — landing page completa do site.
 * Cada seção de categoria é populada pelo RELACIONAMENTO do catálogo
 * (categoryId do admin): mover um produto de categoria no painel reflete
 * aqui. Categorias ocultas ou sem produtos não aparecem. As seções
 * respeitam também a visibilidade configurada no painel, e o cardápio
 * continua visível com a loja fechada (só o pedido é bloqueado).
 */
export function Home() {
  const { landing, storeOpen } = useSettings();
  const v = landing.sectionsVisible;

  const sections = useMenuSections();

  return (
    <>
      {!storeOpen && <StoreClosedBanner />}
      <Hero />

      {v.hamburgueres &&
        sections.map((sec, i) => (
          <CategorySection
            key={sec.category.id}
            id={sec.category.id}
            tone={i % 2 === 0 ? "dark" : "light"}
            first={i === 0}
            cols3={i % 2 === 1}
            eyebrow={i === 0 ? "Cardápio" : sec.category.name}
            title={sec.category.name}
            desc={sec.category.description ?? ""}
            products={sec.products}
          />
        ))}

      {v.avaliacoes && <Reviews />}
      {v.entrega && <DeliveryArea />}
      {v.localizacao && <Localizacao />}
      {v.pedir && <FinalCta />}
    </>
  );
}
