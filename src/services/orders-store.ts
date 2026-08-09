import type { Order } from "./orders";
import type { CustomerData } from "./orders";
import {
  type OrderStatus,
  normalizeStatus,
  nextStatus,
} from "./order-status";

/**
 * orders-store — camada de acesso e SINCRONIZAÇÃO dos pedidos.
 *
 * Hoje a "fonte de verdade" é o localStorage ('avilez_orders') e a
 * atualização em tempo real acontece via BroadcastChannel (mesma origem,
 * entre abas) + evento 'storage'. Quando o admin muda o status numa aba,
 * a tela do cliente em outra aba recebe o aviso e re-renderiza sozinha.
 *
 * FUTURO (Supabase): trocar read/write por chamadas ao banco e o
 * subscribe por supabase.channel(...).on('postgres_changes', ...). A API
 * pública deste módulo (listOrders/getOrder/updateStatus/subscribe) fica igual.
 */

const KEY = "avilez_orders";
const CHANNEL = "avilez_orders_rt";
import { isSupabaseConfigured } from "@/lib/supabase";
import { fetchAdminOrders, changeStatusRemote, cancelOrderRemote } from "@/lib/db";

/** Entrada do histórico de alterações de status. */
export interface StatusEvent {
  status: OrderStatus;
  at: string; // ISO
}

/** Pedido já normalizado para a gestão (status válido + histórico garantido). */
export interface ManagedOrder extends Omit<Order, "status"> {
  status: OrderStatus;
  history: StatusEvent[];
  /** Motivo do cancelamento (quando status = "cancelado"). */
  cancelReason?: string;
  /** UUID do pedido no Supabase (para RPC de status). */
  dbId?: string;
  /** Token público (rastreio). */
  publicToken?: string;
}

// ---------- persistência ----------
function readRaw(): Order[] {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function writeRaw(list: (Order | ManagedOrder)[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function normalize(o: Order & { history?: StatusEvent[]; cancelReason?: string }): ManagedOrder {
  const status = normalizeStatus(o.status);
  const history: StatusEvent[] =
    o.history && o.history.length
      ? o.history
      : [{ status, at: o.createdAt || new Date().toISOString() }];
  return { ...o, status, history, cancelReason: o.cancelReason };
}

// ---------- hidratação (Supabase → mirror local) ----------
// Com Supabase + admin autenticado (RLS), o admin lê os pedidos reais do banco
// (cross-device). O mirror local mantém a UI síncrona; o Realtime chama isto.
export async function hydrateAdminOrders(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const remote = await fetchAdminOrders();
  if (remote) {
    writeRaw(remote);
    broadcast();
  }
}
if (isSupabaseConfigured) void hydrateAdminOrders();

// ---------- API pública ----------
export function listOrders(): ManagedOrder[] {
  return readRaw()
    .map(normalize)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(id: string): ManagedOrder | null {
  const found = readRaw().find((o) => o.id === id);
  return found ? normalize(found) : null;
}

export function updateStatus(id: string, status: OrderStatus): void {
  const list = readRaw().map((o) => normalize(o));
  const idx = list.findIndex((o) => o.id === id);
  if (idx < 0) return;
  const order = list[idx];
  if (order.status === status) return;
  order.status = status;
  order.history = [...order.history, { status, at: new Date().toISOString() }];
  list[idx] = order;
  writeRaw(list);
  broadcast();
}

/** Avança o pedido para o próximo status do fluxo (botão de 1 clique). */
export function advanceStatus(id: string): void {
  const current = getOrder(id);
  if (!current) return;
  const next = nextStatus(current.status);
  if (!next) return;
  updateStatus(id, next);
}

/**
 * Muda o status pela RPC quando o Supabase está ativo (baixa de estoque
 * idempotente ao confirmar + Realtime). Retorna erro estruturado (ex.: estoque
 * insuficiente) para a UI mostrar — NUNCA finge sucesso local.
 */
export async function setStatusRemote(id: string, status: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    updateStatus(id, status);
    return { ok: true };
  }
  const order = getOrder(id);
  if (!order?.dbId) return { ok: false, error: "Pedido não encontrado no servidor." };
  try {
    await changeStatusRemote(order.dbId, status);
    await hydrateAdminOrders();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ESTOQUE_INSUFICIENTE")) {
      const faltantes = msg.split("ESTOQUE_INSUFICIENTE:")[1]?.trim();
      return { ok: false, error: faltantes ? `Estoque insuficiente para confirmar: ${faltantes}.` : "Estoque insuficiente para confirmar este pedido." };
    }
    return { ok: false, error: "Não foi possível atualizar o pedido. Tente novamente." };
  }
}

export async function advanceStatusRemote(id: string): Promise<{ ok: boolean; error?: string }> {
  const current = getOrder(id);
  if (!current) return { ok: false, error: "Pedido não encontrado." };
  const next = nextStatus(current.status);
  if (!next) return { ok: true };
  return setStatusRemote(id, next);
}

export async function cancelOrderRemoteAction(id: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    cancelOrder(id, reason);
    return { ok: true };
  }
  const order = getOrder(id);
  if (!order?.dbId) return { ok: false, error: "Pedido não encontrado no servidor." };
  try {
    await cancelOrderRemote(order.dbId, reason);
    await hydrateAdminOrders();
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível cancelar o pedido. Tente novamente." };
  }
}

/**
 * Cria um PEDIDO MANUAL (feito pelo atendente) com status "recebido".
 * Usa a mesma estrutura dos pedidos normais e dispara o tempo real.
 */
export function createManualOrder(order: Order): ManagedOrder {
  const managed = normalize({ ...order, status: "recebido" });
  managed.history = [{ status: "recebido", at: managed.createdAt }];
  const list = readRaw();
  list.unshift(managed);
  writeRaw(list);
  broadcast();
  return managed;
}

/** Cancela o pedido registrando o motivo. Mantém todo o histórico. */
export function cancelOrder(id: string, reason: string): void {
  const list = readRaw().map((o) => normalize(o));
  const idx = list.findIndex((o) => o.id === id);
  if (idx < 0) return;
  const order = list[idx];
  order.status = "cancelado";
  order.cancelReason = reason.trim() || "Sem motivo informado";
  order.history = [...order.history, { status: "cancelado", at: new Date().toISOString() }];
  list[idx] = order;
  writeRaw(list);
  broadcast();
}

/** Edita os dados do cliente/entrega de um pedido (ação "Editar"). */
export function updateOrderCustomer(id: string, customer: CustomerData): void {
  const list = readRaw().map((o) => normalize(o));
  const idx = list.findIndex((o) => o.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], customer };
  writeRaw(list);
  broadcast();
}

// ---------- pub/sub (tempo real) ----------
type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => emit();
  }
}
function emit() {
  listeners.forEach((l) => l());
}
function broadcast() {
  ensureChannel();
  channel?.postMessage("changed");
  emit(); // atualiza também a aba que fez a mudança
}

/** Assina mudanças nos pedidos. Retorna a função de cancelamento. */
export function subscribe(cb: Listener): () => void {
  ensureChannel();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

