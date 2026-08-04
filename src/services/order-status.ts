/** Status de um pedido. */
export type OrderStatus =
  | "recebido"
  | "confirmado"
  | "producao"
  | "entrega"
  | "entregue"
  | "cancelado";

export interface StatusMeta {
  key: OrderStatus;
  label: string;
  emoji: string;
  /** classes do badge (texto + fundo) */
  badge: string;
  /** cor sólida (dot / timeline) */
  solid: string;
  desc: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  recebido:   { key: "recebido",   label: "Recebido",          emoji: "🟡", badge: "text-primary bg-primary/10",      solid: "bg-primary",     desc: "Pedido recebido, aguardando confirmação." },
  confirmado: { key: "confirmado", label: "Confirmado",        emoji: "🔵", badge: "text-sky-400 bg-sky-400/10",      solid: "bg-sky-400",     desc: "Pedido confirmado pela loja." },
  producao:   { key: "producao",   label: "Em Produção",       emoji: "🟠", badge: "text-orange-400 bg-orange-400/10", solid: "bg-orange-400",  desc: "Seu pedido está sendo preparado na chapa." },
  entrega:    { key: "entrega",    label: "Saiu para Entrega", emoji: "🛵", badge: "text-violet-400 bg-violet-400/10", solid: "bg-violet-400",  desc: "Saiu para entrega e está a caminho." },
  entregue:   { key: "entregue",   label: "Entregue",          emoji: "🟢", badge: "text-emerald-400 bg-emerald-400/10", solid: "bg-emerald-400", desc: "Pedido entregue. Bom apetite!" },
  cancelado:  { key: "cancelado",  label: "Cancelado",         emoji: "🔴", badge: "text-red-400 bg-red-400/10",      solid: "bg-red-400",     desc: "Pedido cancelado." },
};

/** Ordem da linha do tempo (o "cancelado" fica fora do fluxo). */
export const STATUS_FLOW: OrderStatus[] = ["recebido", "confirmado", "producao", "entrega", "entregue"];

/** Rótulos curtos da timeline (conforme o documento). */
export const TIMELINE_LABELS: Record<OrderStatus, string> = {
  recebido: "Recebido",
  confirmado: "Confirmado",
  producao: "Produção",
  entrega: "Entrega",
  entregue: "Finalizado",
  cancelado: "Cancelado",
};

export const ALL_STATUSES: OrderStatus[] = ["recebido", "confirmado", "producao", "entrega", "entregue", "cancelado"];

/** Normaliza status legado/desconhecido para "recebido". */
export function normalizeStatus(raw: string | undefined): OrderStatus {
  if (raw && (ALL_STATUSES as string[]).includes(raw)) return raw as OrderStatus;
  return "recebido";
}
