import { useCatalog } from "./use-catalog";
import { menuProducts, type Product } from "@/services/catalog-menu";

/**
 * Produtos VISÍVEIS de uma categoria PARA A LANDING — vindos do catálogo
 * (Supabase). Depende de useCatalog para re-renderizar quando o Admin altera
 * o cardápio (criar/editar/ocultar/mover produto, mudar preço).
 */
export function useMenuProducts(categoryId: string): Product[] {
  useCatalog(); // reatividade: re-renderiza ao mudar o catálogo
  return menuProducts(categoryId);
}

/** Uma categoria está visível no site? (existe, ativa e não oculta). */
export function useCategoryVisible(categoryId: string): boolean {
  const catalog = useCatalog();
  const c = catalog.categories.find((x) => x.id === categoryId);
  return !!c && !c.hidden;
}

/**
 * Categorias visíveis do site, na ordem — para a landing montar as seções
 * dinamicamente (sem categorias fixas no JSX).
 */
export function useVisibleCategories() {
  const catalog = useCatalog();
  return catalog.categories
    .filter((c) => !c.hidden)
    .slice()
    .sort((a, b) => a.order - b.order);
}

/**
 * Seções do cardápio para a landing: uma por categoria VISÍVEL que tenha
 * produtos, na ordem do catálogo. A landing monta as seções a partir disto
 * (sem categorias fixas no JSX).
 */
export function useMenuSections() {
  const catalog = useCatalog();
  return catalog.categories
    .filter((c) => !c.hidden)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ category: c, products: menuProducts(c.id) }))
    .filter((sec) => sec.products.length > 0);
}
