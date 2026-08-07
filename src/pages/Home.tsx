import {
  Hero,
  CategorySection,
  Reviews,
  DeliveryArea,
  Localizacao,
  FinalCta,
} from "@/components/sections";
import { StoreClosedBanner } from "@/components/sections/StoreClosedBanner";
import { burgers, combos, drinks, desserts } from "@/services/menu-data";
import { useSettings } from "@/hooks";

/**
 * Home — landing page completa do site.
 * As seções respeitam a visibilidade configurada no painel e o cardápio
 * continua visível mesmo com a loja fechada (só o pedido é bloqueado).
 */
export function Home() {
  const { landing, storeOpen } = useSettings();
  const v = landing.sectionsVisible;

  return (
    <>
      {!storeOpen && <StoreClosedBanner />}
      <Hero />

      {v.hamburgueres && (
        <>
          <CategorySection id="hamburgueres" tone="dark" first eyebrow="Cardápio" title={<>Nossos<br />Hambúrgueres</>} desc="Feitos na chapa, na hora. Escolha o seu." products={burgers} />
          <CategorySection id="combos" tone="light" cols3 eyebrow="Combos" title={<>Monte seu<br />Combo</>} desc="Hambúrguer, acompanhamento e bebida por menos." products={combos} />
          <CategorySection id="bebidas" tone="dark" small eyebrow="Bebidas" title={<>Pra<br />Acompanhar</>} desc="Geladas, do jeito que a fome pede." products={drinks} />
          <CategorySection id="sobremesas" tone="light" cols3 eyebrow="Sobremesas" title={<>Final<br />Feliz</>} desc="Aquele docinho pra fechar o pedido." products={desserts} />
        </>
      )}

      {v.avaliacoes && <Reviews />}
      {v.entrega && <DeliveryArea />}
      {v.localizacao && <Localizacao />}
      {v.pedir && <FinalCta />}
    </>
  );
}
