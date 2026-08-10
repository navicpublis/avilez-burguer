/**
 * db.ts — camada de acesso a dados (Supabase).
 *
 * Cada store do app continua com a MESMA API síncrona de sempre (a UI não
 * muda). Este módulo só fornece, por baixo:
 *   • fetchX()  → hidrata o cache do store a partir do Supabase (leitura);
 *   • pushX()   → espelha o estado do store no Supabase (escrita).
 *
 * Tudo é protegido por `isSupabaseConfigured`: sem URL/chave, todas as funções
 * viram no-op e o projeto segue 100% no fallback local (localStorage).
 *
 * OBS de segurança: as ESCRITAS exigem admin autenticado (RLS). Enquanto o
 * Auth não é integrado (Bloco 5), o push é tentado e, se o RLS recusar, é
 * capturado sem quebrar nada — a edição permanece no cache local. As LEITURAS
 * públicas (catálogo, bairros ativos, config) já funcionam para todos.
 *
 * Import de tipos é `import type` de propósito: evita ciclo de importação em
 * runtime (os stores importam funções daqui; aqui só usamos os tipos deles).
 */
import { supabase, isSupabaseConfigured, requireSupabase } from "./supabase";
import type {
  Catalog, Category, CatalogProduct, ProductStatus, ProductBadge,
} from "@/services/catalog-store";
import type { Neighborhood } from "@/services/neighborhoods-store";
import type { Settings } from "@/services/settings-store";
import type { Coupon } from "@/services/coupons-store";
import type { Stock, Ingredient, Movement, RecipeLine, MovementType } from "@/services/stock-store";
import type { ManagedOrder } from "@/services/orders-store";
import type { OrderStatus } from "@/services/order-status";
import type { Review, ReviewStatus } from "@/services/reviews-store";
import type { Note } from "@/services/notes-store";

const ok = () => isSupabaseConfigured && supabase !== null;

/* ───────────────────────── CATÁLOGO ───────────────────────── */

const BADGE_COLS: Record<ProductBadge, "featured" | "best_seller" | "new_product" | "promo" | "limited"> = {
  destaque: "featured", mais_vendido: "best_seller", novidade: "new_product", promocao: "promo", limitado: "limited",
};

function rowToCategory(r: any): Category {
  return { id: r.id, name: r.name, order: r.sort_order ?? 0, hidden: !r.visible, description: r.description ?? undefined, icon: r.icon ?? undefined };
}
function rowToProduct(r: any, groupIds: string[]): CatalogProduct {
  const badges: ProductBadge[] = [];
  if (r.featured) badges.push("destaque");
  if (r.best_seller) badges.push("mais_vendido");
  if (r.new_product) badges.push("novidade");
  if (r.promo) badges.push("promocao");
  if (r.limited) badges.push("limitado");
  return {
    id: r.id, name: r.name, shortDesc: r.short_description ?? "", fullDesc: r.description ?? "",
    categoryId: r.category_id ?? "", price: Number(r.price) || 0,
    promoPrice: r.promotional_price != null ? Number(r.promotional_price) : null,
    image: r.image_url ?? null, prepTime: r.preparation_time ?? 0, weight: r.weight ?? "",
    status: (r.status as ProductStatus) ?? "disponivel", badges, ingredients: r.ingredients ?? [],
    addonGroupIds: groupIds, order: r.sort_order ?? 0,
  };
}

export async function fetchCatalog(): Promise<Catalog | null> {
  if (!ok()) return null;
  try {
    const [cats, prods, groups, adds, links] = await Promise.all([
      supabase!.from("categories").select("*").order("sort_order"),
      supabase!.from("products").select("*").order("sort_order"),
      supabase!.from("addon_groups").select("*").order("sort_order"),
      supabase!.from("addons").select("*").order("sort_order"),
      supabase!.from("product_addon_groups").select("*"),
    ]);
    if (cats.error || prods.error || groups.error || adds.error || links.error) return null;
    // Supabase é a fonte oficial: se as queries funcionaram, use o que veio do
    // banco MESMO que vazio (não repovoa o cardápio antigo). Só mantém o
    // fallback local em caso de ERRO (tratado no return null acima).

    const byProduct = new Map<string, string[]>();
    (links.data ?? []).forEach((l: any) => byProduct.set(l.product_id, [...(byProduct.get(l.product_id) ?? []), l.group_id]));

    return {
      categories: (cats.data ?? []).map(rowToCategory),
      products: (prods.data ?? []).map((r: any) => rowToProduct(r, byProduct.get(r.id) ?? [])),
      groups: (groups.data ?? []).map((g: any) => ({ id: g.id, name: g.name, order: g.sort_order ?? 0, max: g.max_choices ?? 1, required: !!g.required })),
      addons: (adds.data ?? []).map((a: any) => ({ id: a.id, groupId: a.group_id, name: a.name, price: Number(a.price) || 0, available: !!a.available, order: a.sort_order ?? 0 })),
    };
  } catch {
    return null;
  }
}

/** Espelha o catálogo inteiro no Supabase (upsert de tudo + remove o que saiu). */
export async function pushCatalog(cat: Catalog): Promise<void> {
  if (!ok()) return;
  try {
    const s = supabase!;
    await s.from("categories").upsert(cat.categories.map((c) => ({
      id: c.id, name: c.name, slug: c.id, description: c.description ?? "", icon: c.icon ?? null,
      active: true, visible: !c.hidden, sort_order: c.order,
    })));
    await s.from("addon_groups").upsert(cat.groups.map((g) => ({ id: g.id, name: g.name, max_choices: g.max, required: g.required, sort_order: g.order })));
    await s.from("addons").upsert(cat.addons.map((a) => ({ id: a.id, group_id: a.groupId, name: a.name, price: a.price, available: a.available, sort_order: a.order })));
    await s.from("products").upsert(cat.products.map((p) => {
      const flags = { featured: false, best_seller: false, new_product: false, promo: false, limited: false };
      p.badges.forEach((b) => { flags[BADGE_COLS[b]] = true; });
      return {
        id: p.id, category_id: p.categoryId || null, name: p.name, slug: p.id,
        short_description: p.shortDesc, description: p.fullDesc, price: p.price,
        promotional_price: p.promoPrice, image_url: p.image, status: p.status,
        active: true, available: p.status === "disponivel", ...flags,
        preparation_time: p.prepTime, weight: p.weight, ingredients: p.ingredients, sort_order: p.order,
      };
    }));
    // vínculos produto↔grupo: recria (tabela pequena)
    const productIds = cat.products.map((p) => p.id);
    if (productIds.length) await s.from("product_addon_groups").delete().in("product_id", productIds);
    const rows = cat.products.flatMap((p) => p.addonGroupIds.map((g) => ({ product_id: p.id, group_id: g })));
    if (rows.length) await s.from("product_addon_groups").insert(rows);
    // remove itens que não existem mais localmente
    await pruneNotIn(s, "products", cat.products.map((p) => p.id));
    await pruneNotIn(s, "categories", cat.categories.map((c) => c.id));
    await pruneNotIn(s, "addons", cat.addons.map((a) => a.id));
    await pruneNotIn(s, "addon_groups", cat.groups.map((g) => g.id));
  } catch {
    /* RLS/erro: mantém local (Bloco 5 liga a persistência com Auth) */
  }
}

async function pruneNotIn(s: any, table: string, ids: string[]) {
  try {
    if (ids.length === 0) return;
    await s.from(table).delete().not("id", "in", `(${ids.map((i) => `"${i}"`).join(",")})`);
  } catch { /* ignore */ }
}

/* ───────────────────────── BAIRROS ───────────────────────── */

export async function fetchZones(): Promise<Neighborhood[] | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("delivery_zones").select("*").order("sort_order");
    if (error) return null; // só mantém local em ERRO; banco é a fonte (mesmo vazio)
    return (data ?? []).map((z: any) => ({ id: z.id, name: z.name, fee: Number(z.delivery_fee) || 0, avgTime: z.estimated_time ?? "", active: !!z.active }));
  } catch {
    return null;
  }
}

export async function pushZones(list: Neighborhood[]): Promise<void> {
  if (!ok()) return;
  try {
    const s = supabase!;
    // ids do store = slugs estáveis = PK (text) no banco. Upsert por id + prune
    // do que saiu (bairro apagado no Admin some do banco e do site).
    await s.from("delivery_zones").upsert(
      list.map((n, i) => ({
        id: n.id, name: n.name, delivery_fee: n.fee,
        estimated_time: n.avgTime, active: n.active, sort_order: i,
      }))
    );
    await pruneNotIn(s, "delivery_zones", list.map((n) => n.id));
  } catch {
    /* mantém local */
  }
}

/* ─────────────────────── CONFIGURAÇÕES ─────────────────────── */

export async function fetchSettings(): Promise<Partial<Settings> | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("app_settings").select("*");
    if (error || !data?.length) return null;
    const m = new Map<string, any>(data.map((r: any) => [r.key, r.value]));
    const out: Partial<Settings> = {};
    if (m.get("business")) out.business = m.get("business");
    if (m.get("hours")) out.hours = m.get("hours");
    if (m.get("landing")) out.landing = m.get("landing");
    if (m.get("admin")) out.admin = m.get("admin");
    const store = m.get("store");
    if (store && typeof store.open === "boolean") out.storeOpen = store.open;
    return out;
  } catch {
    return null;
  }
}

/** Escreve SOMENTE o status da loja (chave "store") — escrita dedicada e
 *  confiável, sem depender do upsert das demais configurações. */
export async function pushStoreOpen(open: boolean): Promise<boolean> {
  if (!ok()) return false;
  try {
    const { error } = await supabase!.from("app_settings").upsert({ key: "store", value: { open } });
    return !error;
  } catch {
    return false;
  }
}

/** Lê SOMENTE o status atual da loja no Supabase (ou null). */
export async function fetchStoreOpen(): Promise<boolean | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("app_settings").select("value").eq("key", "store").maybeSingle();
    if (error || !data) return null;
    const v = (data as any).value;
    return v && typeof v.open === "boolean" ? v.open : null;
  } catch {
    return null;
  }
}

export async function pushSettings(s: Settings): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from("app_settings").upsert([
      { key: "business", value: s.business },
      { key: "hours", value: s.hours },
      { key: "landing", value: s.landing },
      { key: "admin", value: s.admin },
      { key: "store", value: { open: s.storeOpen } },
    ]);
  } catch {
    /* mantém local */
  }
}

/* ───────────────────────── CUPONS ───────────────────────── */

export async function fetchCoupons(): Promise<Coupon[] | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("coupons").select("*").order("created_at");
    if (error || !data) return null;
    return data.map((c: any): Coupon => ({
      id: c.id, code: c.code, description: c.description ?? "",
      type: c.discount_type === "fixed" ? "fixed" : "pct",
      value: Number(c.discount_type === "fixed" ? c.fixed_amount : c.percentage) || 0,
      minOrder: Number(c.minimum_order) || 0,
      validFrom: c.starts_at ?? null, expiresAt: c.expires_at ?? null,
      usageLimit: c.usage_limit ?? null, perCustomerLimit: c.usage_limit_per_customer ?? null,
      active: !!c.active,
    }));
  } catch { return null; }
}

export async function pushCoupons(list: Coupon[]): Promise<void> {
  if (!ok()) return;
  try {
    const s = supabase!;
    // upsert sem usage_count (preserva o contador do banco)
    await s.from("coupons").upsert(list.map((c) => ({
      id: c.id, code: c.code, description: c.description,
      discount_type: c.type, percentage: c.type === "pct" ? c.value : null,
      fixed_amount: c.type === "fixed" ? c.value : null, minimum_order: c.minOrder,
      starts_at: c.validFrom, expires_at: c.expiresAt,
      usage_limit: c.usageLimit, usage_limit_per_customer: c.perCustomerLimit, active: c.active,
    })));
    await pruneNotIn(s, "coupons", list.map((c) => c.id));
  } catch { /* mantém local */ }
}

export async function fetchCouponUsage(): Promise<Record<string, number> | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("coupons").select("id, usage_count");
    if (error || !data) return null;
    const map: Record<string, number> = {};
    data.forEach((c: any) => { map[c.id] = c.usage_count ?? 0; });
    return map;
  } catch { return null; }
}

/* ───────────────────────── ESTOQUE ───────────────────────── */

const MOV_TO_DB: Record<MovementType, string> = {
  entrada: "entrada", saida: "saida_manual", perda: "perda", ajuste: "ajuste",
};
const MOV_FROM_DB: Record<string, MovementType> = {
  entrada: "entrada", saida_manual: "saida", saida_automatica: "saida", perda: "perda", ajuste: "ajuste",
};

export async function fetchStock(): Promise<Stock | null> {
  if (!ok()) return null;
  try {
    const [ing, rec, mov] = await Promise.all([
      supabase!.from("ingredients").select("*").order("name"),
      supabase!.from("recipes").select("*"),
      supabase!.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (ing.error) return null;
    if (!ing.data?.length) return null; // banco ainda sem estoque → mantém local
    const ingredients: Ingredient[] = ing.data.map((r: any) => ({
      id: r.id, name: r.name, category: r.category, supplier: r.supplier ?? "",
      qty: Number(r.current_stock) || 0, minQty: Number(r.minimum_stock) || 0,
      unit: r.unit, buyPrice: Number(r.purchase_price) || 0, note: r.note ?? "",
    }));
    const recipes: Record<string, RecipeLine[]> = {};
    (rec.data ?? []).forEach((r: any) => {
      (recipes[r.product_id] ||= []).push({ ingredientId: r.ingredient_id, qty: Number(r.quantity) || 0 });
    });
    const movements: Movement[] = (mov.data ?? []).map((m: any) => ({
      id: m.id, ingredientId: m.ingredient_id, type: MOV_FROM_DB[m.type] ?? "ajuste",
      qty: Number(m.quantity) || 0, reason: m.reason ?? "", user: "Administrador",
      at: m.created_at, orderId: m.order_id ?? undefined,
    }));
    return { ingredients, movements, recipes };
  } catch { return null; }
}

export async function pushIngredientsAndRecipes(stock: Stock): Promise<void> {
  if (!ok()) return;
  try {
    const s = supabase!;
    await s.from("ingredients").upsert(stock.ingredients.map((i) => ({
      id: i.id, name: i.name, category: i.category, unit: i.unit,
      current_stock: i.qty, minimum_stock: i.minQty, purchase_price: i.buyPrice,
      supplier: i.supplier, note: i.note, active: true,
    })));
    await pruneNotIn(s, "ingredients", stock.ingredients.map((i) => i.id));
    // receitas: recria por produto (tabela pequena)
    const productIds = Object.keys(stock.recipes);
    if (productIds.length) await s.from("recipes").delete().in("product_id", productIds);
    const rows = productIds.flatMap((pid) =>
      stock.recipes[pid].map((l) => ({ product_id: pid, ingredient_id: l.ingredientId, quantity: l.qty }))
    );
    if (rows.length) await s.from("recipes").insert(rows);
  } catch { /* mantém local */ }
}

/** Insere uma movimentação MANUAL no Supabase (entrada/saída/perda/ajuste). */
export async function pushMovement(m: Movement, newQty: number): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from("stock_movements").insert({
      ingredient_id: m.ingredientId, type: MOV_TO_DB[m.type] ?? "ajuste",
      quantity: m.qty, new_stock: newQty, reason: m.reason,
    });
  } catch { /* mantém local */ }
}

/* ─────────────────── PEDIDOS (admin) + status via RPC ─────────────────── */

export async function fetchAdminOrders(): Promise<ManagedOrder[] | null> {
  if (!ok()) return null;
  try {
    const s = supabase!;
    const { data: orders, error } = await s.from("orders").select("*").order("created_at", { ascending: false });
    if (error || !orders) return null;
    const ids = orders.map((o: any) => o.id);
    const [items, hist] = await Promise.all([
      ids.length ? s.from("order_items").select("*").in("order_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? s.from("order_status_history").select("*").in("order_id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const itemsByOrder = new Map<string, any[]>();
    (items.data ?? []).forEach((it: any) => itemsByOrder.set(it.order_id, [...(itemsByOrder.get(it.order_id) ?? []), it]));
    const histByOrder = new Map<string, any[]>();
    (hist.data ?? []).forEach((h: any) => histByOrder.set(h.order_id, [...(histByOrder.get(h.order_id) ?? []), h]));

    return orders.map((o: any): ManagedOrder => ({
      id: o.order_number ?? o.id,
      createdAt: o.created_at,
      status: o.status as OrderStatus,
      customer: {
        name: o.customer_name ?? "", phone: o.customer_phone ?? "",
        street: "", number: "", complement: "", neighborhood: o.delivery_zone_name ?? "",
        reference: "", cep: "",
      },
      payment: o.payment_method, changeFor: o.change_for != null ? String(o.change_for) : null,
      items: (itemsByOrder.get(o.id) ?? []).map((it: any) => ({
        name: it.product_name_snapshot, qty: it.quantity, addons: [], obs: it.notes ?? "",
        unitPrice: Number(it.unit_price) || 0, lineTotal: Number(it.subtotal) || 0,
      })),
      subtotal: Number(o.subtotal) || 0, fee: Number(o.delivery_fee) || 0,
      discount: Number(o.discount) || 0, coupon: o.coupon_code ?? null, total: Number(o.total) || 0,
      notes: o.customer_notes || undefined,
      trackingUrl: "",
      history: (histByOrder.get(o.id) ?? [])
        .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
        .map((h: any) => ({ status: h.new_status as OrderStatus, at: h.created_at })),
      cancelReason: o.cancellation_reason ?? undefined,
      publicToken: o.public_token,
      dbId: o.id,
    } as ManagedOrder));
  } catch { return null; }
}

/** Muda status via RPC (baixa estoque idempotente ao confirmar). Lança em falha. */
export async function changeStatusRemote(dbId: string, status: OrderStatus): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("change_order_status", { p_order_id: dbId, p_new_status: status });
  if (error) throw new Error(error.message || "Falha ao mudar status.");
}

export async function cancelOrderRemote(dbId: string, reason: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("cancel_order", { p_order_id: dbId, p_reason: reason });
  if (error) throw new Error(error.message || "Falha ao cancelar.");
}

/* ───────────────────────── AVALIAÇÕES ───────────────────────── */

export async function fetchReviews(): Promise<Review[] | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("reviews").select("*").order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map((r: any): Review => ({
      id: r.id, name: r.customer_name ?? "", orderId: r.order_id ?? null,
      rating: r.rating ?? 5, comment: r.comment ?? "", createdAt: r.created_at,
      status: r.status as ReviewStatus,
    }));
  } catch { return null; }
}

export async function setReviewStatusRemote(id: string, status: ReviewStatus): Promise<void> {
  if (!ok()) return;
  try { await supabase!.from("reviews").update({ status, moderated_at: new Date().toISOString() }).eq("id", id); }
  catch { /* mantém local */ }
}

export async function deleteReviewRemote(id: string): Promise<void> {
  if (!ok()) return;
  try { await supabase!.from("reviews").delete().eq("id", id); } catch { /* ignore */ }
}

/** Cliente envia avaliação pela RPC segura (por public_token). Lança em falha. */
/** Estado da avaliação de um pedido pelo public_token (para o acompanhamento):
 *  revela só se está entregue e se já foi avaliado. Sem dados sensíveis. */
export async function fetchOrderReviewStatus(token: string): Promise<{ found: boolean; delivered: boolean; reviewed: boolean } | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.rpc("order_review_status", { p_token: token });
    if (error || !data) return null;
    const d = data as any;
    return { found: !!d.found, delivered: !!d.delivered, reviewed: !!d.reviewed };
  } catch {
    return null;
  }
}

export async function submitReviewRemote(token: string, rating: number, comment: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc("submit_review", { p_token: token, p_rating: rating, p_comment: comment });
  if (error) throw new Error(error.message || "Falha ao enviar avaliação.");
}

/* ───────────────────────── ANOTAÇÕES ───────────────────────── */

export async function fetchNotes(): Promise<Note[] | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!.from("notes").select("*").order("created_at", { ascending: false });
    if (error || !data) return null;
    return data.map((n: any): Note => ({
      id: n.id, title: n.title, content: n.content ?? "", priority: n.priority,
      date: n.due_date ?? null, status: n.status, createdAt: n.created_at,
    }));
  } catch { return null; }
}

export async function pushNotes(list: Note[]): Promise<void> {
  if (!ok()) return;
  try {
    const s = supabase!;
    await s.from("notes").upsert(list.map((n) => ({
      id: n.id, title: n.title, content: n.content, priority: n.priority,
      status: n.status, due_date: n.date,
    })));
    await pruneNotIn(s, "notes", list.map((n) => n.id));
  } catch { /* mantém local */ }
}
