import type { ManagedOrder } from "./orders-store";
import type { OrderStatus } from "./order-status";

/**
 * dashboard-metrics — cálculos da Dashboard a partir dos pedidos REAIS
 * do armazenamento local. Nada é inventado: quando não há pedidos no
 * período, tudo volta zerado / vazio.
 */

export type PeriodKey = "hoje" | "7d" | "30d" | "90d" | "tudo" | "custom";

export interface Period {
  key: PeriodKey;
  /** ISO da data inicial (para "custom"). */
  from?: string;
  /** ISO da data final (para "custom"). */
  to?: string;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "tudo", label: "Todo o período" },
  { key: "custom", label: "Personalizado" },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Intervalo [from, to] em ms a partir do período. */
export function periodRange(p: Period, now = Date.now()): { from: number; to: number } {
  const end = now;
  if (p.key === "tudo") return { from: 0, to: end };
  if (p.key === "custom") {
    const from = p.from ? new Date(p.from).getTime() : 0;
    const to = p.to ? startOfDay(new Date(p.to)).getTime() + 86400000 - 1 : end;
    return { from, to };
  }
  if (p.key === "hoje") return { from: startOfDay(new Date(now)).getTime(), to: end };
  const days = p.key === "7d" ? 7 : p.key === "30d" ? 30 : 90;
  return { from: end - days * 86400000, to: end };
}

export function filterByPeriod(orders: ManagedOrder[], p: Period, now = Date.now()): ManagedOrder[] {
  const { from, to } = periodRange(p, now);
  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= from && t <= to;
  });
}

function isCancelled(o: ManagedOrder): boolean {
  return o.status === "cancelado";
}

/** Momento em que o pedido entrou em determinado status (do histórico). */
function reachedAt(o: ManagedOrder, status: OrderStatus): number | null {
  const ev = o.history.find((h) => h.status === status);
  return ev ? new Date(ev.at).getTime() : null;
}

export interface DashboardMetrics {
  orders: number;
  revenue: number;
  inProduction: number;
  delivered: number;
  avgTicket: number | null;
  /** minutos médios entre "recebido" e "entregue" (null = sem dados). */
  avgDeliveryMin: number | null;
}

export function computeMetrics(list: ManagedOrder[]): DashboardMetrics {
  const valid = list.filter((o) => !isCancelled(o));
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const delivered = list.filter((o) => o.status === "entregue");
  const inProduction = list.filter((o) => o.status === "producao").length;

  let avgDeliveryMin: number | null = null;
  const durations: number[] = [];
  delivered.forEach((o) => {
    const start = reachedAt(o, "recebido") ?? new Date(o.createdAt).getTime();
    const end = reachedAt(o, "entregue");
    if (end && end > start) durations.push((end - start) / 60000);
  });
  if (durations.length) {
    avgDeliveryMin = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  }

  return {
    orders: list.length,
    revenue,
    inProduction,
    delivered: delivered.length,
    avgTicket: valid.length ? revenue / valid.length : null,
    avgDeliveryMin,
  };
}

// ---------- séries para gráficos ----------
export interface DayPoint {
  label: string; // dd/mm
  iso: string; // yyyy-mm-dd
  orders: number;
  revenue: number;
}

/** Série diária (pedidos e faturamento) dentro do período. */
export function dailySeries(list: ManagedOrder[], p: Period, now = Date.now()): DayPoint[] {
  const { from, to } = periodRange(p, now);
  const start = from > 0 ? from : Math.min(...list.map((o) => new Date(o.createdAt).getTime()), now);
  const days: DayPoint[] = [];
  const dayMs = 86400000;
  const s = startOfDay(new Date(start)).getTime();
  const e = startOfDay(new Date(Math.min(to, now))).getTime();
  // limita a 90 pontos para não estourar o gráfico
  const totalDays = Math.min(90, Math.floor((e - s) / dayMs) + 1);
  for (let i = 0; i < totalDays; i++) {
    const d0 = s + i * dayMs;
    const d1 = d0 + dayMs;
    const inDay = list.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= d0 && t < d1;
    });
    const valid = inDay.filter((o) => !isCancelled(o));
    const dt = new Date(d0);
    days.push({
      label: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
      iso: dt.toISOString().slice(0, 10),
      orders: inDay.length,
      revenue: valid.reduce((sum, o) => sum + o.total, 0),
    });
  }
  return days;
}

/** Distribuição por forma de pagamento (pedidos não cancelados). */
export function paymentBreakdown(list: ManagedOrder[]): { label: string; value: number }[] {
  const map = new Map<string, number>();
  list.filter((o) => !isCancelled(o)).forEach((o) => {
    map.set(o.payment, (map.get(o.payment) ?? 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Produtos mais vendidos (soma de quantidade, pedidos não cancelados). */
export function topProducts(list: ManagedOrder[], limit = 5): { name: string; value: number }[] {
  const map = new Map<string, number>();
  list.filter((o) => !isCancelled(o)).forEach((o) => {
    o.items.forEach((it) => map.set(it.name, (map.get(it.name) ?? 0) + it.qty));
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
