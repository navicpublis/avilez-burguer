/**
 * catalog-menu.ts — fonte ÚNICA do cardápio para o site público e o carrinho.
 *
 * Expõe os produtos/adicionais do catálogo (que hidrata do Supabase) no mesmo
 * formato `Product`/`Addon` que a UI já consome — assim o site, o carrinho e o
 * checkout leem do Supabase sem qualquer redesenho. O menu-data deixou de ser
 * a fonte: só reaproveitamos aqui a lista estática de sugestões de observação
 * (texto de UI, não é dado de catálogo).
 *
 * Regra: se o produto tiver imagem (Storage), usa a URL; senão fica sem imagem
 * (o card mostra o placeholder neutro). NUNCA puxa imagem de outro produto.
 */
import { getCatalog, subscribe as subscribeCatalogStore, type CatalogProduct } from "./catalog-store";

export interface Product {
  id: string;
  cat: string;
  name: string;
  desc: string;
  ingredients: string[];
  price: number;
  oldPrice?: number;
  image?: string;
  badge?: string;
  available: boolean;
  hasAddons: boolean;
}
export interface Addon {
  id: string;
  name: string;
  price: number;
}

export { OBS_SUGGESTIONS } from "./menu-data";

function badgeLabel(cp: CatalogProduct): string | undefined {
  if (cp.badges.includes("mais_vendido")) return "Mais pedido";
  if (cp.badges.includes("novidade")) return "Novo";
  if (cp.badges.includes("promocao")) return "Promoção";
  if (cp.badges.includes("destaque")) return "Destaque";
  return undefined;
}

function toProduct(cp: CatalogProduct): Product {
  const hasPromo = cp.promoPrice != null && cp.promoPrice > 0 && cp.promoPrice < cp.price;
  return {
    id: cp.id,
    cat: cp.categoryId,
    name: cp.name,
    desc: cp.shortDesc || cp.fullDesc || "",
    ingredients: cp.ingredients ?? [],
    price: hasPromo ? (cp.promoPrice as number) : cp.price,
    oldPrice: hasPromo ? cp.price : undefined,
    image: cp.image ?? undefined,
    badge: badgeLabel(cp),
    available: cp.status === "disponivel",
    hasAddons: (cp.addonGroupIds?.length ?? 0) > 0,
  };
}

/** Produtos VISÍVEIS de uma categoria (para a landing), ordenados. */
export function menuProducts(categoryId: string): Product[] {
  return getCatalog()
    .products.filter((p) => p.status !== "oculto" && p.categoryId === categoryId)
    .sort((a, b) => a.order - b.order)
    .map(toProduct);
}

/** Um produto pelo id (para carrinho/checkout). */
export function findProduct(id: string): Product | undefined {
  const cp = getCatalog().products.find((p) => p.id === id);
  return cp ? toProduct(cp) : undefined;
}

/** Um adicional pelo id. */
export function findAddon(id: string): Addon | undefined {
  const a = getCatalog().addons.find((x) => x.id === id);
  return a ? { id: a.id, name: a.name, price: a.price } : undefined;
}

/** Adicionais disponíveis de um produto (pelos grupos vinculados a ele). */
export function productAddons(productId: string): Addon[] {
  const cat = getCatalog();
  const cp = cat.products.find((p) => p.id === productId);
  if (!cp) return [];
  const groups = new Set(cp.addonGroupIds);
  return cat.addons
    .filter((a) => groups.has(a.groupId) && a.available)
    .sort((a, b) => a.order - b.order)
    .map((a) => ({ id: a.id, name: a.name, price: a.price }));
}

/** Assina mudanças do catálogo (reexport para conveniência). */
export const subscribeCatalog = subscribeCatalogStore;
