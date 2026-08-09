/**
 * coupons-store — cupons salvos localmente (base para a gestão completa
 * numa próxima fase). Persiste em 'avilez_coupons' com pub/sub simples.
 */

import { listOrders } from "./orders-store";

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: "pct" | "fixed";
  value: number;
  minOrder: number;
  validFrom: string | null; // yyyy-mm-dd (validade inicial)
  expiresAt: string | null; // yyyy-mm-dd (validade final)
  usageLimit: number | null; // limite total de usos
  perCustomerLimit: number | null; // limite por cliente
  active: boolean;
}

import { fetchCoupons, pushCoupons, fetchCouponUsage } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

const KEY = "avilez_coupons";
let cache: Coupon[] | null = null;
let usageCache: Record<string, number> = {};

function uid(): string {
  return `cpn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function read(): Coupon[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(raw) ? raw : [];
    return cache;
  } catch {
    return [];
  }
}
function write(list: Coupon[]): void {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  if (isSupabaseConfigured) void pushCoupons(list);
}

// hidratação Supabase → cache
if (isSupabaseConfigured) {
  void fetchCoupons().then((remote) => {
    if (remote) {
      cache = remote;
      try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch { /* ignore */ }
      emit();
    }
  });
  void fetchCouponUsage().then((u) => { if (u) { usageCache = u; emit(); } });
}

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  listeners.forEach((l) => l());
}

export function listCoupons(): Coupon[] {
  return read();
}

export type CouponInput = Omit<Coupon, "id">;

export function createCoupon(input: CouponInput): Coupon {
  const list = read();
  const item: Coupon = { ...input, id: uid(), code: input.code.toUpperCase().trim() };
  list.push(item);
  write(list);
  emit();
  return item;
}

export function updateCoupon(id: string, patch: Partial<CouponInput>): void {
  const list = read();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  write(list);
  emit();
}

export function deleteCoupon(id: string): void {
  write(read().filter((c) => c.id !== id));
  emit();
}

/** Quantidade de usos reais de um cupom (pedidos não cancelados). */
export function couponUsage(code: string): number {
  if (isSupabaseConfigured) {
    const c = read().find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
    if (c && usageCache[c.id] != null) return usageCache[c.id];
  }
  const up = code.trim().toUpperCase();
  return listOrders().filter((o) => o.status !== "cancelado" && (o.coupon ?? "").toUpperCase() === up).length;
}

/**
 * Valida um código de cupom contra o que está REALMENTE cadastrado.
 * Retorna o cupom válido ou null. Nunca revela o motivo (código
 * inexistente, inativo, vencido, etc.) — quem chama mostra uma
 * única mensagem genérica. `subtotal` permite checar o valor mínimo.
 * Sem cupons cadastrados, qualquer código é recusado.
 */
export function validateCoupon(rawCode: string, subtotal: number): Coupon | null {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const c = read().find((x) => x.code.toUpperCase() === code);
  if (!c) return null;
  if (!c.active) return null;
  const now = Date.now();
  if (c.validFrom) {
    const start = new Date(c.validFrom).getTime();
    if (now < start) return null;
  }
  if (c.expiresAt) {
    const end = new Date(c.expiresAt).getTime() + 86400000 - 1; // vence no fim do dia
    if (now > end) return null;
  }
  if (typeof c.usageLimit === "number" && c.usageLimit > 0 && couponUsage(c.code) >= c.usageLimit) return null;
  if (c.minOrder > 0 && subtotal < c.minOrder) return null;
  return c;
}
