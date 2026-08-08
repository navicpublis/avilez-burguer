import { useCatalog } from "./use-catalog";
import { burgers, combos, drinks, desserts, type Product } from "@/services/menu-data";

/** Todos os produtos "vendáveis" (base do carrinho vem do menu-data). */
const ALL: Product[] = [...burgers, ...combos, ...drinks, ...desserts];

/**
 * Produtos de uma categoria PARA A LANDING.
 * O que o produto É (nome/preço/imagem/carrinho) vem do menu-data; em qual
 * categoria ele aparece vem do RELACIONAMENTO do catálogo (categoryId do
 * admin). Assim, mover um produto de categoria no painel reflete no cardápio
 * sem tocar no carrinho. Produtos ocultos (status) não aparecem.
 */
export function useMenuProducts(categoryId: string): Product[] {
  const catalog = useCatalog();
  return ALL.filter((p) => {
    const cp = catalog.products.find((c) => c.id === p.id);
    if (cp && cp.status === "oculto") return false;
    const currentCat = cp ? cp.categoryId : p.cat;
    return currentCat === categoryId;
  });
}

/** Uma categoria está visível no site? (existe e não está oculta). */
export function useCategoryVisible(categoryId: string): boolean {
  const catalog = useCatalog();
  const c = catalog.categories.find((x) => x.id === categoryId);
  return !!c && !c.hidden;
}
