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
  // Regra global: qualquer produto tem adicionais se existir algum adicional
  // ativo no cardápio (grupos globais), independente de vínculo manual.
  const anyAddonActive = getCatalog().addons.some((a) => a.available);
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
    hasAddons: anyAddonActive,
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

/**
 * Adicionais disponíveis de um produto.
 *
 * REGRA GLOBAL: todo produto pode usar TODOS os adicionais ativos do cardápio
 * (grupos globais), sem precisar de vínculo manual produto→grupo. Basta o
 * adicional estar disponível (available). Isso é só leitura — não cria nenhum
 * registro em product_addon_groups. Um adicional desativado não aparece.
 */
export function productAddons(productId: string): Addon[] {
  const cat = getCatalog();
  const cp = cat.products.find((p) => p.id === productId);
  if (!cp) return [];
  // ordena por grupo (order do grupo) e depois pela ordem do adicional,
  // para manter "Extras", "Queijos", etc. agrupados visualmente.
  const groupOrder = new Map(cat.groups.map((g) => [g.id, g.order]));
  return cat.addons
    .filter((a) => a.available)
    .sort((a, b) => {
      const go = (groupOrder.get(a.groupId) ?? 999) - (groupOrder.get(b.groupId) ?? 999);
      return go !== 0 ? go : a.order - b.order;
    })
    .map((a) => ({ id: a.id, name: a.name, price: a.price }));
}

/** Assina mudanças do catálogo (reexport para conveniência). */
export const subscribeCatalog = subscribeCatalogStore;

/* ─────────── Upsell "Virar combo?" (adicional dinâmico, sem tocar o banco) ───────────
 * Todo HAMBÚRGUER (categorias Tradicionais / Artesanais / Hambúrgueres) pode
 * virar combo somando um valor fixo — acompanha 1 batata + 1 refrigerante lata.
 * Não cria produto no banco; é só um flag no item do carrinho. NÃO se aplica a
 * bebidas, sobremesas, acompanhamentos nem combos já existentes. */
export const COMBO_PRICE = 12;
export const COMBO_LABEL = "Batata + Refrigerante lata";

/** Nome da categoria de um produto (do catálogo real; "" se não achar). */
export function categoryNameOf(productId: string): string {
  const cat = getCatalog();
  const p = cat.products.find((x) => x.id === productId);
  if (!p) return "";
  return cat.categories.find((c) => c.id === p.categoryId)?.name ?? "";
}

/** É um hambúrguer que pode virar combo? (tradicional/artesanal/hambúrguer,
 *  nunca combo/bebida/sobremesa/porção). Decide pelo NOME da categoria — assim
 *  funciona com as categorias reais do banco sem hardcodar ids. */
export function canBecomeCombo(product: Product): boolean {
  const name = categoryNameOf(product.id).toLowerCase();
  if (!name) return false;
  // exclusões explícitas (combos já existentes, bebidas, etc.)
  if (/(combo|bebida|refri|drink|sobremesa|doce|sorvete|acompanh|porç|porc|batata)/.test(name)) return false;
  // inclusões: hambúrgueres tradicionais/artesanais
  return /(tradicion|artesan|h[aâ]mb[uú]rg|burg|lanche|smash)/.test(name);
}
