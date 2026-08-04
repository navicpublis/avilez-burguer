import { getCatalog } from "./catalog-store";
import {
  listOrders,
  subscribe as subscribeOrders,
  type ManagedOrder,
} from "./orders-store";

/**
 * stock-store — FONTE ÚNICA do estoque.
 *
 * Controle por INGREDIENTE (nunca por produto). Cada produto tem uma Receita
 * Técnica (ingrediente + quantidade); quando um pedido é CONFIRMADO, os
 * ingredientes são descontados automaticamente. Persiste em localStorage
 * ('avilez_stock') com pub/sub; a API já está no formato para virar Supabase
 * (trocar read/write/subscribe mantendo as assinaturas).
 */

export type IngredientCategory =
  | "paes" | "carnes" | "queijos" | "molhos" | "verduras"
  | "bebidas" | "sobremesas" | "embalagens" | "descartaveis" | "outros";

export type StockUnit = "kg" | "g" | "ml" | "l" | "un" | "pacote" | "caixa";
export type MovementType = "entrada" | "saida" | "ajuste" | "perda";
export type StockStatus = "ok" | "baixo" | "zerado";

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  supplier: string;
  qty: number;
  minQty: number;
  unit: StockUnit;
  buyPrice: number; // preço de compra por unidade
  note: string;
}

export interface Movement {
  id: string;
  ingredientId: string;
  type: MovementType;
  qty: number; // magnitude (sempre positiva); o tipo define o sinal
  reason: string;
  user: string;
  at: string; // ISO
  orderId?: string;
}

/** Linha de receita: quantos do ingrediente o produto consome por unidade vendida. */
export interface RecipeLine {
  ingredientId: string;
  qty: number;
}

export interface Stock {
  ingredients: Ingredient[];
  movements: Movement[];
  recipes: Record<string, RecipeLine[]>; // productId -> linhas
}

export const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  paes: "Pães", carnes: "Carnes", queijos: "Queijos", molhos: "Molhos",
  verduras: "Verduras", bebidas: "Bebidas", sobremesas: "Sobremesas",
  embalagens: "Embalagens", descartaveis: "Descartáveis", outros: "Outros",
};
export const UNIT_LABEL: Record<StockUnit, string> = {
  kg: "Kg", g: "g", ml: "ml", l: "L", un: "Unidade", pacote: "Pacote", caixa: "Caixa",
};
export const MOVEMENT_LABEL: Record<MovementType, string> = {
  entrada: "Entrada", saida: "Saída", ajuste: "Ajuste Manual", perda: "Perda",
};
export const STATUS_LABEL: Record<StockStatus, string> = {
  ok: "Em estoque", baixo: "Estoque baixo", zerado: "Zerado",
};
export const STATUS_TONE: Record<StockStatus, string> = {
  ok: "text-emerald-400 bg-emerald-400/10",
  baixo: "text-amber-400 bg-amber-400/10",
  zerado: "text-red-400 bg-red-400/10",
};

export function stockStatus(i: Ingredient): StockStatus {
  if (i.qty <= 0) return "zerado";
  if (i.qty <= i.minQty) return "baixo";
  return "ok";
}

const KEY = "avilez_stock";
const CHANNEL = "avilez_stock_rt";
const CONSUMED_KEY = "avilez_stock_consumed"; // ids de pedidos já baixados (idempotência)
const CURRENT_USER = "Guilherme";

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- seed ----------
function seedStock(): Stock {
  const ing = (id: string, name: string, category: IngredientCategory, unit: StockUnit, qty: number, minQty: number, supplier: string, buyPrice: number): Ingredient =>
    ({ id, name, category, supplier, qty, minQty, unit, buyPrice, note: "" });

  const ingredients: Ingredient[] = [
    ing("pao_brioche", "Pão Brioche", "paes", "un", 100, 20, "Padaria Central", 1.2),
    ing("blend", "Hambúrguer Blend 160g", "carnes", "un", 80, 20, "Frigorífico Costa Verde", 4.5),
    ing("cheddar", "Cheddar (fatia)", "queijos", "un", 150, 30, "Laticínios Serra", 0.9),
    ing("bacon", "Bacon", "carnes", "g", 4000, 1000, "Frigorífico Costa Verde", 0.05),
    ing("alface", "Alface", "verduras", "un", 40, 10, "Hortifruti do Vale", 2.0),
    ing("tomate", "Tomate", "verduras", "un", 60, 15, "Hortifruti do Vale", 0.8),
    ing("cebola", "Cebola", "verduras", "un", 50, 12, "Hortifruti do Vale", 0.6),
    ing("molho_especial", "Molho Especial", "molhos", "ml", 5000, 1000, "Produção Interna", 0.02),
    ing("barbecue", "Molho Barbecue", "molhos", "ml", 3000, 800, "Distribuidora Sabor", 0.03),
    ing("batata", "Batata (porção)", "outros", "un", 70, 20, "Congelados Sul", 3.5),
    ing("refri_lata", "Refrigerante Lata", "bebidas", "un", 120, 30, "Distribuidora Bebidas RJ", 3.0),
    ing("embalagem", "Embalagem (caixa burger)", "embalagens", "un", 200, 50, "Embalagens Rio", 0.7),
    ing("guardanapo", "Guardanapo", "descartaveis", "pacote", 15, 5, "Embalagens Rio", 4.0),
  ];

  const recipes: Record<string, RecipeLine[]> = {
    classico: [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 1 }, { ingredientId: "cheddar", qty: 1 }, { ingredientId: "alface", qty: 1 }, { ingredientId: "tomate", qty: 1 }, { ingredientId: "embalagem", qty: 1 }],
    duplo: [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 2 }, { ingredientId: "cheddar", qty: 2 }, { ingredientId: "molho_especial", qty: 20 }, { ingredientId: "embalagem", qty: 1 }],
    salada: [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 1 }, { ingredientId: "cheddar", qty: 1 }, { ingredientId: "alface", qty: 1 }, { ingredientId: "tomate", qty: 1 }, { ingredientId: "cebola", qty: 1 }, { ingredientId: "embalagem", qty: 1 }],
    bacon: [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 1 }, { ingredientId: "cheddar", qty: 1 }, { ingredientId: "bacon", qty: 30 }, { ingredientId: "barbecue", qty: 15 }, { ingredientId: "embalagem", qty: 1 }],
    "combo-classico": [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 1 }, { ingredientId: "cheddar", qty: 1 }, { ingredientId: "batata", qty: 1 }, { ingredientId: "refri_lata", qty: 1 }, { ingredientId: "embalagem", qty: 1 }],
    "combo-duplo": [{ ingredientId: "pao_brioche", qty: 1 }, { ingredientId: "blend", qty: 2 }, { ingredientId: "cheddar", qty: 2 }, { ingredientId: "batata", qty: 1 }, { ingredientId: "refri_lata", qty: 1 }, { ingredientId: "embalagem", qty: 1 }],
    "combo-dois": [{ ingredientId: "pao_brioche", qty: 2 }, { ingredientId: "blend", qty: 2 }, { ingredientId: "cheddar", qty: 2 }, { ingredientId: "batata", qty: 2 }, { ingredientId: "refri_lata", qty: 2 }, { ingredientId: "embalagem", qty: 2 }],
    refri: [{ ingredientId: "refri_lata", qty: 1 }],
  };

  return { ingredients, movements: [], recipes };
}

// ---------- persistência ----------
function read(): Stock {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stock;
      if (s && s.ingredients) return s;
    }
  } catch {
    /* ignore */
  }
  const seeded = seedStock();
  write(seeded);
  return seeded;
}
function write(s: Stock): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  // FUTURO (Supabase): upsert em ingredients / movements / recipes
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
function commit(s: Stock) {
  write(s);
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
export function getStock(): Stock {
  return read();
}
export function listIngredients(): Ingredient[] {
  return [...read().ingredients].sort((a, b) => a.name.localeCompare(b.name));
}
export function getIngredient(id: string): Ingredient | null {
  return read().ingredients.find((i) => i.id === id) ?? null;
}
export function listMovements(ingredientId?: string): Movement[] {
  const all = [...read().movements].sort((a, b) => (a.at < b.at ? 1 : -1));
  return ingredientId ? all.filter((m) => m.ingredientId === ingredientId) : all;
}
export function getRecipe(productId: string): RecipeLine[] {
  return read().recipes[productId] ?? [];
}
export function lastUpdatedAt(): string | null {
  const m = read().movements;
  if (!m.length) return null;
  return m.reduce((acc, x) => (x.at > acc ? x.at : acc), m[0].at);
}

/** Ingredientes com status != ok viram avisos da central. */
export function stockNotifications(): { id: string; level: StockStatus; text: string }[] {
  return read().ingredients
    .map((i) => ({ i, s: stockStatus(i) }))
    .filter((x) => x.s !== "ok")
    .sort((a) => (a.s === "zerado" ? -1 : 1))
    .map((x) => ({
      id: x.i.id,
      level: x.s,
      text: x.s === "zerado" ? `${x.i.name} acabou` : `${x.i.name} abaixo do mínimo`,
    }));
}

/** Quais receitas (produtos) usam este ingrediente. */
export function recipesUsingIngredient(ingredientId: string): { productId: string; qty: number }[] {
  const { recipes } = read();
  const out: { productId: string; qty: number }[] = [];
  for (const pid of Object.keys(recipes)) {
    const line = recipes[pid].find((l) => l.ingredientId === ingredientId);
    if (line) out.push({ productId: pid, qty: line.qty });
  }
  return out;
}

/** Últimos produtos que consumiram este ingrediente (das movimentações de baixa). */
export function recentConsumers(ingredientId: string, limit = 8): Movement[] {
  return listMovements(ingredientId).filter((m) => m.orderId).slice(0, limit);
}

// ---------- ingredientes: CRUD ----------
export type IngredientInput = Omit<Ingredient, "id">;
export function createIngredient(input: IngredientInput): Ingredient {
  const s = read();
  const ing: Ingredient = { ...input, id: uid("ing") };
  s.ingredients.push(ing);
  if (ing.qty > 0) s.movements.push(mv(ing.id, "entrada", ing.qty, "Cadastro inicial"));
  commit(s);
  return ing;
}
export function updateIngredient(id: string, patch: Partial<IngredientInput>): void {
  const s = read();
  const i = s.ingredients.findIndex((x) => x.id === id);
  if (i < 0) return;
  s.ingredients[i] = { ...s.ingredients[i], ...patch };
  commit(s);
}
export function deleteIngredient(id: string): void {
  const s = read();
  s.ingredients = s.ingredients.filter((x) => x.id !== id);
  s.movements = s.movements.filter((m) => m.ingredientId !== id);
  for (const pid of Object.keys(s.recipes)) {
    s.recipes[pid] = s.recipes[pid].filter((l) => l.ingredientId !== id);
  }
  commit(s);
}

// ---------- movimentações / ajuste manual ----------
function mv(ingredientId: string, type: MovementType, qty: number, reason: string, orderId?: string): Movement {
  return { id: uid("mov"), ingredientId, type, qty: Math.abs(qty), reason, user: CURRENT_USER, at: new Date().toISOString(), orderId };
}
function applyDelta(s: Stock, ingredientId: string, delta: number) {
  const i = s.ingredients.findIndex((x) => x.id === ingredientId);
  if (i >= 0) s.ingredients[i] = { ...s.ingredients[i], qty: Math.max(0, s.ingredients[i].qty + delta) };
}
/** Adiciona estoque (entrada). */
export function addStock(id: string, qty: number, reason: string): void {
  const s = read(); applyDelta(s, id, Math.abs(qty)); s.movements.push(mv(id, "entrada", qty, reason || "Entrada")); commit(s);
}
/** Remove estoque (saída). */
export function removeStock(id: string, qty: number, reason: string): void {
  const s = read(); applyDelta(s, id, -Math.abs(qty)); s.movements.push(mv(id, "saida", qty, reason || "Saída")); commit(s);
}
/** Registra perda. */
export function registerLoss(id: string, qty: number, reason: string): void {
  const s = read(); applyDelta(s, id, -Math.abs(qty)); s.movements.push(mv(id, "perda", qty, reason || "Perda")); commit(s);
}
/** Corrige para uma quantidade exata (ajuste manual). */
export function correctStock(id: string, newQty: number, reason: string): void {
  const s = read();
  const cur = s.ingredients.find((x) => x.id === id);
  if (!cur) return;
  const delta = newQty - cur.qty;
  applyDelta(s, id, delta);
  s.movements.push(mv(id, "ajuste", Math.abs(delta), reason || "Ajuste manual"));
  commit(s);
}

// ---------- receita técnica ----------
export function setRecipe(productId: string, lines: RecipeLine[]): void {
  const s = read();
  s.recipes[productId] = lines.filter((l) => l.ingredientId && l.qty > 0);
  commit(s);
}

// ---------- BAIXA AUTOMÁTICA ----------
function consumedSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(CONSUMED_KEY) || "[]")); } catch { return new Set(); }
}
function markConsumed(ids: Set<string>) {
  try { localStorage.setItem(CONSUMED_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
}

/** Resolve o productId de um item de pedido pelo nome (OrderItem não carrega id). */
function productIdByName(name: string): string | null {
  const p = getCatalog().products.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
  return p ? p.id : null;
}

/**
 * Desconta os ingredientes de um pedido conforme a receita técnica de cada item.
 * Idempotente: um pedido só baixa uma vez (guardado em CONSUMED_KEY).
 */
export function consumeForOrder(order: ManagedOrder): boolean {
  const consumed = consumedSet();
  if (consumed.has(order.id)) return false;
  const s = read();
  let any = false;
  for (const item of order.items) {
    const pid = productIdByName(item.name);
    if (!pid) continue;
    const recipe = s.recipes[pid];
    if (!recipe || !recipe.length) continue;
    for (const line of recipe) {
      const total = line.qty * item.qty;
      applyDelta(s, line.ingredientId, -total);
      s.movements.push(mv(line.ingredientId, "saida", total, `Baixa automática — pedido ${order.id}`, order.id));
      any = true;
    }
  }
  consumed.add(order.id);
  markConsumed(consumed);
  if (any) commit(s); else write(s); // marca consumido mesmo sem receita, evitando reprocesso
  return any;
}

let autoStarted = false;
/**
 * Liga o observador da baixa automática: quando um pedido passa a "confirmado"
 * (ou além), desconta os ingredientes uma única vez. Não altera a área de
 * Pedidos — apenas observa o store de pedidos.
 */
export function initStockAutoConsume(): () => void {
  if (autoStarted) return () => {};
  autoStarted = true;
  const sweep = () => {
    const consumed = consumedSet();
    for (const o of listOrders()) {
      const active = o.status !== "recebido" && o.status !== "cancelado"; // confirmado em diante
      if (active && !consumed.has(o.id)) consumeForOrder(o);
    }
  };
  sweep();
  return subscribeOrders(sweep);
}
