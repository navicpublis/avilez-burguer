import type { ManagedOrder } from "./orders-store";

/**
 * customers — clientes DERIVADOS dos pedidos reais (agrupados por telefone).
 * Não há cadastro separado nem dados fictícios: se não há pedidos, não há
 * clientes. Fonte única = orders-store.
 */

export interface CustomerSummary {
  key: string; // telefone normalizado
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  avgTicket: number;
  firstOrder: string;
  lastOrder: string;
  topProduct: string | null;
  topPayment: string | null;
  topNeighborhood: string | null;
  history: ManagedOrder[];
}

function digits(s: string): string {
  return s.replace(/\D/g, "");
}
function mode(arr: string[]): string | null {
  if (!arr.length) return null;
  const m = new Map<string, number>();
  arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function buildCustomers(orders: ManagedOrder[]): CustomerSummary[] {
  const valid = orders.filter((o) => o.status !== "cancelado");
  const map = new Map<string, ManagedOrder[]>();
  valid.forEach((o) => {
    const key = digits(o.customer.phone) || o.customer.name.toLowerCase();
    map.set(key, [...(map.get(key) ?? []), o]);
  });

  const out: CustomerSummary[] = [];
  map.forEach((list, key) => {
    const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const totalSpent = list.reduce((s, o) => s + o.total, 0);
    const products: string[] = [];
    list.forEach((o) => o.items.forEach((it) => { for (let i = 0; i < it.qty; i++) products.push(it.name); }));
    out.push({
      key,
      name: sorted[sorted.length - 1].customer.name,
      phone: sorted[sorted.length - 1].customer.phone,
      orders: list.length,
      totalSpent,
      avgTicket: totalSpent / list.length,
      firstOrder: sorted[0].createdAt,
      lastOrder: sorted[sorted.length - 1].createdAt,
      topProduct: mode(products),
      topPayment: mode(list.map((o) => o.payment)),
      topNeighborhood: mode(list.map((o) => o.customer.neighborhood).filter(Boolean)),
      history: sorted.reverse(),
    });
  });
  return out;
}
