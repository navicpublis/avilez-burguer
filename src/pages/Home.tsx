import {
  Hero,
  CategorySection,
  Reviews,
  DeliveryArea,
  Localizacao,
  FinalCta,
} from "@/components/sections";
import { StoreClosedBanner } from "@/components/sections/StoreClosedBanner";
import { useSettings, useMenuProducts, useCategoryVisible } from "@/hooks";

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

  const burgers = useMenuProducts("hamburgueres");
  const combos = useMenuProducts("combos");
  const drinks = useMenuProducts("bebidas");
  const desserts = useMenuProducts("sobremesas");

  const showBurgers = useCategoryVisible("hamburgueres") && burgers.length > 0;
  const showCombos = useCategoryVisible("combos") && combos.length > 0;
  const showDrinks = useCategoryVisible("bebidas") && drinks.length > 0;
  const showDesserts = useCategoryVisible("sobremesas") && desserts.length > 0;

  return (
    <>
      {!storeOpen && <StoreClosedBanner />}
      <Hero />

      {v.hamburgueres && (
        <>
          {showBurgers && (
            <CategorySection id="hamburgueres" tone="dark" first eyebrow="Cardápio" title={<>Nossos<br />Hambúrgueres</>} desc="Feitos na chapa, na hora. Escolha o seu." products={burgers} />
          )}
          {showCombos && (
            <CategorySection id="combos" tone="light" cols3 eyebrow="Combos" title={<>Monte seu<br />Combo</>} desc="Hambúrguer, acompanhamento e bebida por menos." products={combos} />
          )}
          {showDrinks && (
            <CategorySection id="bebidas" tone="dark" small eyebrow="Bebidas" title={<>Pra<br />Acompanhar</>} desc="Geladas, do jeito que a fome pede." products={drinks} />
          )}
          {showDesserts && (
            <CategorySection id="sobremesas" tone="light" cols3 eyebrow="Sobremesas" title={<>Final<br />Feliz</>} desc="Aquele docinho pra fechar o pedido." products={desserts} />
          )}
        </>
      )}

      {v.avaliacoes && <Reviews />}
      {v.entrega && <DeliveryArea />}
      {v.localizacao && <Localizacao />}
      {v.pedir && <FinalCta />}
    </>
  );
}
