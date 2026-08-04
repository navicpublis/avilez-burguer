import { useMemo, useState } from "react";
import { Search, Eye, Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useOrders } from "@/hooks";
import { type OrderStatus } from "@/services/order-status";
import type { ManagedOrder } from "@/services/orders-store";
import { StatusBadge } from "@/components/order/StatusBadge";
import { OrderDetail } from "../components/OrderDetail";

type FilterKey = "todos" | OrderStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "recebido", label: "Novos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "producao", label: "Em Produção" },
  { key: "entrega", label: "Saiu p/ Entrega" },
  { key: "entregue", label: "Entregues" },
  { key: "cancelado", label: "Cancelados" },
];

type SortKey = "recentes" | "antigos" | "valor" | "status";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recentes", label: "Mais recentes" },
  { key: "antigos", label: "Mais antigos" },
  { key: "valor", label: "Maior valor" },
  { key: "status", label: "Status" },
];

function minutesSince(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diff < 1) return "agora";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  return `${h}h${diff % 60 ? ` ${diff % 60}min` : ""}`;
}

function OrderCard({ order, onOpen }: { order: ManagedOrder; onOpen: () => void }) {
  const c = order.customer;
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-neutral-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold">#{order.id}</div>
          <div className="truncate text-sm text-muted-foreground">{c.name} · {c.phone}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        <span className="truncate">{c.street}, {c.number} · {c.neighborhood}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div>
          <div className="font-display text-base font-extrabold">{formatCurrency(order.total)}</div>
          <div className="text-xs text-muted-foreground">
            {count} {count === 1 ? "item" : "itens"} · {order.payment}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> {minutesSince(order.createdAt)}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label={`Ver pedido ${order.id}`}
          >
            <Eye className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** OrdersPage — gestão de pedidos (filtros, busca, ordenação). */
export function OrdersPage() {
  const orders = useOrders();
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recentes");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = orders.filter((o) => filter === "todos" || o.status === filter);
    if (q) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "")) && q.replace(/\D/g, "") !== ""
      );
    }
    const order = ["recebido", "confirmado", "producao", "entrega", "entregue", "cancelado"];
    list = [...list].sort((a, b) => {
      if (sort === "antigos") return a.createdAt < b.createdAt ? -1 : 1;
      if (sort === "valor") return b.total - a.total;
      if (sort === "status") return order.indexOf(a.status) - order.indexOf(b.status);
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    return list;
  }, [orders, filter, query, sort]);

  const open = openId ? orders.find((o) => o.id === openId) ?? null : null;

  return (
    <main className="w-full max-w-[1500px] px-6 py-7 pb-12">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Pedidos</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Gerencie e acompanhe todos os pedidos em tempo real</p>
      </div>

      {/* busca + ordenação */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou número do pedido..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* filtros rápidos */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === f.key ? "bg-primary/20" : "bg-secondary")}>
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* lista */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onOpen={() => setOpenId(o.id)} />
          ))}
        </div>
      )}

      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}
    </main>
  );
}
