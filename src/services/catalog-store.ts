import {
  burgers, combos, drinks, desserts, ADDONS,
  type Product as MenuProduct,
} from "./menu-data";

/**
 * catalog-store — FONTE ÚNICA do cardápio.
 *
 * Centraliza produtos, categorias e grupos de adicionais. Hoje persiste em
 * localStorage ('avilez_catalog') com pub/sub; a API pública já está no
 * formato para virar Supabase depois (só trocar o corpo de read/write e o
 * subscribe por realtime, mantendo as assinaturas).
 */

export type ProductStatus = "disponivel" | "indisponivel" | "oculto" | "em_falta";
export type ProductBadge = "destaque" | "mais_vendido" | "novidade" | "promocao" | "limitado";

export interface Category {
  id: string;
  name: string;
  order: number;
  hidden: boolean;
}

/** Grupo reutilizável de adicionais (ex.: Molhos, Queijos, Carnes). */
export interface AddonGroup {
  id: string;
  name: string;
  order: number;
  /** quantos itens do grupo o cliente pode escolher no máximo */
  max: number;
  /** o cliente é obrigado a escolher ao menos um? */
  required: boolean;
}

export interface Addon {
  id: string;
  groupId: string;
  name: string;
  price: number;
  available: boolean;
  order: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  shortDesc: string;
  fullDesc: string;
  categoryId: string;
  price: number;
  promoPrice: number | null;
  image: string | null;
  prepTime: number; // minutos
  weight: string; // opcional (ex.: "220g")
  status: ProductStatus;
  badges: ProductBadge[];
  ingredients: string[];
  addonGroupIds: string[];
  order: number;
}

export interface Catalog {
  categories: Category[];
  groups: AddonGroup[];
  addons: Addon[];
  products: CatalogProduct[];
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  disponivel: "Disponível",
  indisponivel: "Indisponível",
  oculto: "Oculto",
  em_falta: "Em Falta",
};
export const STATUS_TONE: Record<ProductStatus, string> = {
  disponivel: "text-emerald-400 bg-emerald-400/10",
  indisponivel: "text-muted-foreground bg-secondary",
  oculto: "text-sky-400 bg-sky-400/10",
  em_falta: "text-red-400 bg-red-400/10",
};
export const BADGE_LABEL: Record<ProductBadge, string> = {
  destaque: "Destaque",
  mais_vendido: "Mais Vendido",
  novidade: "Novidade",
  promocao: "Promoção",
  limitado: "Limitado",
};

const KEY = "avilez_catalog";
const CHANNEL = "avilez_catalog_rt";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- seed a partir do cardápio atual ----------
function seedCatalog(): Catalog {
  const categories: Category[] = [
    { id: "hamburgueres", name: "Hambúrgueres", order: 0, hidden: false },
    { id: "combos", name: "Combos", order: 1, hidden: false },
    { id: "bebidas", name: "Bebidas", order: 2, hidden: false },
    { id: "sobremesas", name: "Sobremesas", order: 3, hidden: false },
    { id: "kids", name: "Kids", order: 4, hidden: false },
    { id: "molhos", name: "Molhos", order: 5, hidden: false },
  ];
  const groups: AddonGroup[] = [
    { id: "grp_extras", name: "Extras", order: 0, max: 5, required: false },
    { id: "grp_queijos", name: "Queijos", order: 1, max: 2, required: false },
    { id: "grp_molhos", name: "Molhos", order: 2, max: 3, required: false },
  ];
  const addons: Addon[] = ADDONS.map((a, i) => ({
    id: `add_${a.id}`,
    groupId: a.id === "cheddar" ? "grp_queijos" : a.id === "molho" ? "grp_molhos" : "grp_extras",
    name: a.name,
    price: a.price,
    available: true,
    order: i,
  }));

  const map = (p: MenuProduct, order: number): CatalogProduct => ({
    id: p.id,
    name: p.name,
    shortDesc: p.desc,
    fullDesc: p.desc,
    categoryId: p.cat,
    price: p.price,
    promoPrice: p.oldPrice ? p.price : null,
    image: p.image ?? null,
    prepTime: p.cat === "hamburgueres" || p.cat === "combos" ? 20 : 5,
    weight: "",
    status: p.available ? "disponivel" : "em_falta",
    badges: p.badge === "Mais pedido" ? ["mais_vendido"] : p.badge === "Novo" ? ["novidade"] : p.oldPrice ? ["promocao"] : [],
    ingredients: p.ingredients,
    addonGroupIds: p.hasAddons ? ["grp_extras", "grp_queijos", "grp_molhos"] : [],
    order,
  });

  let o = 0;
  const products: CatalogProduct[] = [
    ...burgers.map((p) => map(p, o++)),
    ...combos.map((p) => map(p, o++)),
    ...drinks.map((p) => map(p, o++)),
    ...desserts.map((p) => map(p, o++)),
  ];
  return { categories, groups, addons, products };
}

// ---------- persistência ----------
function read(): Catalog {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Catalog;
  } catch {
    /* ignore */
  }
  const seeded = seedCatalog();
  write(seeded);
  return seeded;
}
function write(cat: Catalog): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cat));
  } catch {
    /* ignore */
  }
  // FUTURO (Supabase): upsert nas tabelas products/categories/addon_groups/addons
}

// ---------- pub/sub ----------
type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => listeners.forEach((l) => l());
  }
}
function commit(cat: Catalog) {
  write(cat);
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
}
export function subscribe(cb: Listener): () => void {
  ensureChannel();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

// ---------- leitura ----------
export function getCatalog(): Catalog {
  return read();
}
export function listProducts(): CatalogProduct[] {
  return [...read().products].sort((a, b) => a.order - b.order);
}
export function getProduct(id: string): CatalogProduct | null {
  return read().products.find((p) => p.id === id) ?? null;
}
export function listCategories(): Category[] {
  return [...read().categories].sort((a, b) => a.order - b.order);
}
export function listGroups(): AddonGroup[] {
  return [...read().groups].sort((a, b) => a.order - b.order);
}
export function listAddons(groupId?: string): Addon[] {
  const all = [...read().addons].sort((a, b) => a.order - b.order);
  return groupId ? all.filter((a) => a.groupId === groupId) : all;
}

// ---------- produtos: CRUD ----------
export type ProductInput = Omit<CatalogProduct, "id" | "order">;

export function createProduct(input: ProductInput): CatalogProduct {
  const cat = read();
  const order = cat.products.filter((p) => p.categoryId === input.categoryId).length;
  const product: CatalogProduct = { ...input, id: uid("prod"), order };
  cat.products.push(product);
  commit(cat);
  return product;
}
export function updateProduct(id: string, patch: Partial<ProductInput>): void {
  const cat = read();
  const i = cat.products.findIndex((p) => p.id === id);
  if (i < 0) return;
  cat.products[i] = { ...cat.products[i], ...patch };
  commit(cat);
}
export function deleteProduct(id: string): void {
  const cat = read();
  cat.products = cat.products.filter((p) => p.id !== id);
  commit(cat);
}
export function duplicateProduct(id: string): CatalogProduct | null {
  const cat = read();
  const src = cat.products.find((p) => p.id === id);
  if (!src) return null;
  const order = cat.products.filter((p) => p.categoryId === src.categoryId).length;
  const copy: CatalogProduct = { ...src, id: uid("prod"), name: `${src.name} (cópia)`, order };
  cat.products.push(copy);
  commit(cat);
  return copy;
}
export function setProductStatus(id: string, status: ProductStatus): void {
  updateProduct(id, { status });
}
/** Reordena produtos de uma categoria a partir da lista de ids ordenada. */
export function reorderProducts(orderedIds: string[]): void {
  const cat = read();
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  cat.products.forEach((p) => {
    if (pos.has(p.id)) p.order = pos.get(p.id)!;
  });
  commit(cat);
}

// ---------- categorias: CRUD ----------
export function createCategory(name: string): Category {
  const cat = read();
  const c: Category = { id: uid("cat"), name, order: cat.categories.length, hidden: false };
  cat.categories.push(c);
  commit(cat);
  return c;
}
export function updateCategory(id: string, patch: Partial<Omit<Category, "id">>): void {
  const cat = read();
  const i = cat.categories.findIndex((c) => c.id === id);
  if (i < 0) return;
  cat.categories[i] = { ...cat.categories[i], ...patch };
  commit(cat);
}
export function deleteCategory(id: string): void {
  const cat = read();
  cat.categories = cat.categories.filter((c) => c.id !== id);
  commit(cat);
}
export function reorderCategories(orderedIds: string[]): void {
  const cat = read();
  const pos = new Map(orderedIds.map((id, i) => [id, i]));
  cat.categories.forEach((c) => {
    if (pos.has(c.id)) c.order = pos.get(c.id)!;
  });
  commit(cat);
}

// ---------- grupos de adicionais: CRUD ----------
export function createGroup(name: string, max = 5, required = false): AddonGroup {
  const cat = read();
  const g: AddonGroup = { id: uid("grp"), name, order: cat.groups.length, max, required };
  cat.groups.push(g);
  commit(cat);
  return g;
}
export function updateGroup(id: string, patch: Partial<Omit<AddonGroup, "id">>): void {
  const cat = read();
  const i = cat.groups.findIndex((g) => g.id === id);
  if (i < 0) return;
  cat.groups[i] = { ...cat.groups[i], ...patch };
  commit(cat);
}
export function deleteGroup(id: string): void {
  const cat = read();
  cat.groups = cat.groups.filter((g) => g.id !== id);
  cat.addons = cat.addons.filter((a) => a.groupId !== id);
  cat.products.forEach((p) => (p.addonGroupIds = p.addonGroupIds.filter((gid) => gid !== id)));
  commit(cat);
}
export function createAddon(groupId: string, name: string, price: number): Addon {
  const cat = read();
  const order = cat.addons.filter((a) => a.groupId === groupId).length;
  const a: Addon = { id: uid("add"), groupId, name, price, available: true, order };
  cat.addons.push(a);
  commit(cat);
  return a;
}
export function updateAddon(id: string, patch: Partial<Omit<Addon, "id" | "groupId">>): void {
  const cat = read();
  const i = cat.addons.findIndex((a) => a.id === id);
  if (i < 0) return;
  cat.addons[i] = { ...cat.addons[i], ...patch };
  commit(cat);
}
export function deleteAddon(id: string): void {
  const cat = read();
  cat.addons = cat.addons.filter((a) => a.id !== id);
  commit(cat);
}
