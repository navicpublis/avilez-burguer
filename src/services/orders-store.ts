import type { Order } from "./orders";
import {
  type OrderStatus,
  normalizeStatus,
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
const SEED_FLAG = "avilez_orders_seeded";
const CHANNEL = "avilez_orders_rt";

/** Entrada do histórico de alterações de status. */
export interface StatusEvent {
  status: OrderStatus;
  at: string; // ISO
}

/** Pedido já normalizado para a gestão (status válido + histórico garantido). */
export interface ManagedOrder extends Omit<Order, "status"> {
  status: OrderStatus;
  history: StatusEvent[];
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

function normalize(o: Order & { history?: StatusEvent[] }): ManagedOrder {
  const status = normalizeStatus(o.status);
  const history: StatusEvent[] =
    o.history && o.history.length
      ? o.history
      : [{ status, at: o.createdAt || new Date().toISOString() }];
  return { ...o, status, history };
}

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

// ---------- seed de exemplo (só p/ demonstração, se estiver vazio) ----------
export function seedIfEmpty(): void {
  try {
    if (localStorage.getItem(SEED_FLAG) === "1") return;
    if (readRaw().length > 0) {
      localStorage.setItem(SEED_FLAG, "1");
      return;
    }
    const now = Date.now();
    const min = 60 * 1000;
    const mk = (
      id: string,
      name: string,
      phone: string,
      total: number,
      status: OrderStatus,
      agoMin: number,
      items: ManagedOrder["items"]
    ): ManagedOrder => ({
      id,
      createdAt: new Date(now - agoMin * min).toISOString(),
      status,
      customer: {
        name,
        phone,
        street: "Rua das Flores",
        number: "123",
        complement: "",
        neighborhood: "Centro",
        reference: "",
        cep: "",
      },
      payment: "PIX",
      changeFor: null,
      items,
      subtotal: total - 6,
      fee: 6,
      discount: 0,
      coupon: null,
      total,
      trackingUrl: `https://avilezburguer.com.br/pedido/${id}`,
      history: [{ status, at: new Date(now - agoMin * min).toISOString() }],
    });
    const seed: ManagedOrder[] = [
      mk("AVLZ-48392", "Renan Souza", "(21) 99888-1122", 79.8, "recebido", 3, [
        { name: "Duplo Cheddar", qty: 2, addons: ["Bacon"], obs: "Sem cebola", unitPrice: 39.9, lineTotal: 79.8 },
      ]),
      mk("AVLZ-51203", "Marina Alves", "(21) 99777-3344", 45.9, "producao", 14, [
        { name: "Avilez Clássico", qty: 1, addons: [], obs: "", unitPrice: 27.9, lineTotal: 27.9 },
        { name: "Refrigerante Lata", qty: 2, addons: [], obs: "", unitPrice: 6.9, lineTotal: 13.8 },
      ]),
      mk("AVLZ-49881", "Carlos Nunes", "(21) 99666-5566", 122.4, "entrega", 26, [
        { name: "Combo a Dois", qty: 1, addons: [], obs: "Caprichar no molho", unitPrice: 84.9, lineTotal: 84.9 },
        { name: "Bacon Supremo", qty: 1, addons: ["Cheddar extra"], obs: "", unitPrice: 41.9, lineTotal: 41.9 },
      ]),
      mk("AVLZ-49102", "Beatriz Lima", "(21) 99555-7788", 38.9, "entregue", 44, [
        { name: "Salada da Casa", qty: 1, addons: [], obs: "", unitPrice: 29.9, lineTotal: 29.9 },
      ]),
    ];
    writeRaw(seed);
    localStorage.setItem(SEED_FLAG, "1");
  } catch {
    /* ignore */
  }
}
