import { formatCurrency } from "@/utils/format";

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
  return `${BASE_URL}/pedido/${id}`;
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

/** Monta a mensagem do WhatsApp exatamente no padrão da Avilez Burguer. */
export function buildWhatsAppMessage(order: Order): string {
  const { customer } = order;

  const addressLines = [customer.street, customer.number];
  if (customer.complement.trim()) addressLines.push(customer.complement);
  addressLines.push(customer.neighborhood);
  if (customer.reference.trim()) addressLines.push(`Ref.: ${customer.reference}`);

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
    "🍔 *NOVO PEDIDO - AVILEZ BURGUER*",
    "",
    `📦 Pedido: ${order.id}`,
    "",
    "👤 Cliente:",
    customer.name,
    "",
    "📱 WhatsApp:",
    customer.phone,
    "",
    "📍 Endereço:",
    ...addressLines,
    "",
    DIVIDER,
    "",
    "🛒 ITENS",
    "",
    itemBlocks.join("\n\n"),
    "",
    DIVIDER,
    "",
    "💰 Forma de pagamento:",
    "",
    paymentLine,
    "",
    DIVIDER,
    "",
    "TOTAL",
    "",
    formatCurrency(order.total),
    "",
    DIVIDER,
    "",
    "📲 Acompanhar pedido:",
    "",
    order.trackingUrl,
  ];

  return parts.join("\n");
}

/** URL do WhatsApp já com a mensagem do pedido codificada. */
export function whatsappUrl(order: Order): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildWhatsAppMessage(order)
  )}`;
}
