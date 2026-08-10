import { supabase, isSupabaseConfigured, requireSupabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/format";
import { getSettings } from "@/services/settings-store";

/** WhatsApp da Avilez Burguer (destino do pedido). +55 21 97190-2603 */
export const WHATSAPP_NUMBER = "5521971902603";

/** Dados do cliente (persistidos para o próximo pedido). */
export interface CustomerData {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  reference: string;
  cep: string;
}

export type PaymentMethod = "PIX" | "Dinheiro" | "Cartão na Entrega";

/** Snapshot de um item no momento do pedido (bom para futura persistência). */
export interface OrderItem {
  name: string;
  qty: number;
  addons: string[];
  obs: string;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Pedido — estrutura preparada para futura integração com banco (Supabase).
 * Por enquanto é salvo em localStorage; o formato já é o que iria para a tabela.
 */
export interface Order {
  id: string;
  createdAt: string;
  status: string;
  customer: CustomerData;
  payment: PaymentMethod;
  changeFor: string | null;
  items: OrderItem[];
  subtotal: number;
  fee: number;
  discount: number;
  coupon: string | null;
  total: number;
  /** Observações gerais do pedido (opcional). Salvo no pedido. */
  notes?: string;
  trackingUrl: string;
}

const ORDERS_KEY = "avilez_orders";
const BASE_URL = "https://avilezburguer.com.br";

/** Gera um ID único no padrão AVLZ-48392. */
export function generateOrderId(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `AVLZ-${n}`;
}

/** Link exclusivo de acompanhamento do pedido. */
export function trackingUrl(id: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : BASE_URL;
  return `${origin}/pedido/${id}`;
}

/**
 * Salva o pedido. Hoje persiste em localStorage; a assinatura já está pronta
 * para virar um INSERT no Supabase depois (só trocar o corpo desta função).
 */
export function saveOrder(order: Order): void {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const list = Array.isArray(raw) ? raw : [];
    list.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  // FUTURO (Supabase):
  // await supabase.from("orders").insert(order);
}

/** Busca um pedido salvo por ID (usado pela página de acompanhamento). */
export function getOrder(id: string): Order | null {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const list: Order[] = Array.isArray(raw) ? raw : [];
    return list.find((o) => o.id === id) ?? null;
  } catch {
    return null;
  }
}

const DIVIDER = "----------------------------";

/**
 * Emojis por code point (source 100% ASCII) — evita QUALQUER corrupção de
 * encoding (o caractere de substituição) no pipeline git/editor/build.
 * São reconstruídos em runtime, então a mensagem nunca sai com caractere quebrado.
 */
const EMOJI = {
  burger: "\u{1F354}",   // 🍔
  order: "\u{1F4CB}",    // 📋
  user: "\u{1F464}",     // 👤
  phone: "\u{1F4F1}",    // 📱
  pin: "\u{1F4CD}",      // 📍
  cart: "\u{1F6D2}",     // 🛒
  money: "\u{1F4B0}",    // 💰
  note: "\u{1F4DD}",     // 📝
  link: "\u{1F517}",     // 🔗
};

/** Monta a mensagem do WhatsApp exatamente no padrão da Avilez Burguer. */
export function buildWhatsAppMessage(order: Order): string {
  const { customer } = order;

  const isPickup = /retirada/i.test(customer.neighborhood || "");
  const addressLines: string[] = [];
  if (isPickup) {
    addressLines.push("Retirada no local");
  } else {
    addressLines.push(customer.street, customer.number);
    if (customer.complement.trim()) addressLines.push(customer.complement);
    addressLines.push(customer.neighborhood);
    if (customer.reference.trim()) addressLines.push(`Ref.: ${customer.reference}`);
  }

  const itemBlocks = order.items.map((it) => {
    const lines: string[] = [`${it.qty}x ${it.name}`];
    it.addons.forEach((a) => lines.push(`+ ${a}`));
    if (it.obs.trim()) {
      lines.push("");
      lines.push("Observação:");
      lines.push(it.obs);
    }
    lines.push("");
    lines.push(formatCurrency(it.lineTotal));
    return lines.join("\n");
  });

  const paymentLine =
    order.payment === "Dinheiro" && order.changeFor
      ? `Dinheiro (troco para ${formatCurrency(Number(order.changeFor))})`
      : order.payment;

  const parts = [
    `${EMOJI.burger} *NOVO PEDIDO - AVILEZ BURGUER*`,
    "",
    `${EMOJI.order} Pedido: ${order.id}`,
    "",
    `${EMOJI.user} Cliente:`,
    customer.name,
    "",
    `${EMOJI.phone} WhatsApp:`,
    customer.phone,
    "",
    `${EMOJI.pin} Endereço:`,
    ...addressLines,
    "",
    DIVIDER,
    "",
    `${EMOJI.cart} ITENS`,
    "",
    itemBlocks.join("\n\n"),
    "",
    DIVIDER,
    "",
    `${EMOJI.money} Forma de pagamento:`,
    "",
    paymentLine,
  ];

  // Observações gerais do pedido (quando houver)
  if (order.notes && order.notes.trim()) {
    parts.push("", DIVIDER, "", `${EMOJI.note} Observações:`, "", order.notes.trim());
  }

  parts.push(
    "",
    DIVIDER,
    "",
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Entrega: ${order.fee > 0 ? formatCurrency(order.fee) : "Grátis"}`,
  );
  if (order.discount > 0) {
    parts.push(`Desconto: -${formatCurrency(order.discount)}`);
  }
  parts.push(
    "",
    `TOTAL: ${formatCurrency(order.total)}`,
    "",
    DIVIDER,
    "",
    `${EMOJI.link} Acompanhar pedido:`,
    "",
    order.trackingUrl
  );

  return parts.join("\n");
}

/** URL do WhatsApp já com a mensagem do pedido codificada. */
export function whatsappUrl(order: Order): string {
  // Número oficial: o configurado em Configurações (settings) tem prioridade.
  let number = WHATSAPP_NUMBER;
  try {
    const configured = getSettings().business.whatsapp?.replace(/\D/g, "");
    if (configured && configured.length >= 12) number = configured;
  } catch {
    /* usa o padrão */
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage(order))}`;
}


/* ─────────────────── Integração Supabase (pedidos) ─────────────────── */

/** Item do pedido no formato esperado pela RPC create_order. */
export interface RemoteOrderItem {
  product_id: string | null;
  name: string;
  unit_price: number; // preço BASE do produto (a RPC soma os adicionais)
  quantity: number;
  notes: string;
  addons: { name: string; price: number }[];
}

export interface RemoteOrderPayload {
  customer: { name: string; phone: string };
  address: { street: string; number: string; complement: string; reference: string; cep: string };
  delivery_zone_id: string;
  payment_method: PaymentMethod;
  change_for: string | null;
  coupon_code: string | null;
  customer_notes: string;
  items: RemoteOrderItem[];
}

/**
 * Cria o pedido no Supabase (RPC segura create_order). O SERVIDOR calcula
 * taxa e desconto, cria cliente/endereço/pedido/itens/adicionais e devolve o
 * order_number + public_token. Lança erro se algo falhar — o chamador NÃO
 * deve abrir o WhatsApp nesse caso.
 */
export async function placeRemoteOrder(
  payload: RemoteOrderPayload
): Promise<{ publicToken: string; orderNumber: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("create_order", { payload });
  if (error) throw new Error(error.message || "Falha ao registrar o pedido.");
  if (!data || !data.public_token) throw new Error("Resposta inválida do servidor.");
  return { publicToken: String(data.public_token), orderNumber: String(data.order_number) };
}

/**
 * Busca um pedido pelo public_token (RPC pública get_order_by_token) e devolve
 * no formato que a tela de acompanhamento já usa. Retorna null se não achar ou
 * se o Supabase não estiver configurado.
 */
export async function getRemoteOrderByToken(token: string): Promise<Order & { history: { status: string; at: string }[] } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc("get_order_by_token", { p_token: token });
    if (error || !data) return null;
    const items: OrderItem[] = (data.items ?? []).map((it: Record<string, unknown>) => ({
      name: String(it.name ?? ""),
      qty: Number(it.quantity ?? 1),
      addons: [],
      obs: String(it.notes ?? ""),
      unitPrice: Number(it.unit_price ?? 0),
      lineTotal: Number(it.subtotal ?? 0),
    }));
    return {
      id: String(data.order_number ?? token),
      createdAt: String(data.created_at ?? new Date().toISOString()),
      status: String(data.status ?? "recebido"),
      customer: {
        name: String(data.customer_name ?? ""),
        phone: "", street: "", number: "", complement: "", neighborhood: "", reference: "", cep: "",
      },
      payment: (data.payment_method ?? "PIX") as PaymentMethod,
      changeFor: null,
      items,
      subtotal: Number(data.subtotal ?? 0),
      fee: Number(data.delivery_fee ?? 0),
      discount: Number(data.discount ?? 0),
      coupon: null,
      total: Number(data.total ?? 0),
      trackingUrl: trackingUrl(token),
      history: (data.history ?? []).map((h: Record<string, unknown>) => ({ status: String(h.status), at: String(h.at) })),
    };
  } catch {
    return null;
  }
}
