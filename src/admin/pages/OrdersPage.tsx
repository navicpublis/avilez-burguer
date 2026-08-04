import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Eye,
  Pencil,
  X,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useOrders } from "@/hooks";
import {
  STATUS_META,
  advanceLabel,
  type OrderStatus,
} from "@/services/order-status";
import {
  advanceStatus,
  cancelOrder,
  type ManagedOrder,
} from "@/services/orders-store";
import { StatusBadge } from "@/components/order/StatusBadge";
import { OrderDetail } from "../components/OrderDetail";

type FilterKey = "todos" | OrderStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "recebido", label: "Recebidos" },
  { key: "confirmado", label: "Confirmados" },
  { key: "producao", label: "Em Produção" },
  { key: "entrega", label: "Saiu p/ Entrega" },
  { key: "entregue", label: "Entregues" },
  { key: "cancelado", label: "Cancelados" },
];

/** Seções na ordem operacional (usado quando o filtro é "Todos"). */
const GROUPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Recebidos", statuses: ["recebido"] },
  { label: "Confirmados", statuses: ["confirmado"] },
  { label: "Em Produção", statuses: ["producao"] },
  { label: "Saiu para Entrega", statuses: ["entrega"] },
  { label: "Concluídos", statuses: ["entregue", "cancelado"] },
];

/** Minutos a partir dos quais um pedido em aberto é destacado (atrasado). */
const OVERDUE_MIN = 45;

/** Cor da borda esquerda do card por status. */
const LEFT_BORDER: Record<OrderStatus, string> = {
  recebido: "border-l-primary",
  confirmado: "border-l-sky-400",
  producao: "border-l-orange-400",
  entrega: "border-l-violet-400",
  entregue: "border-l-emerald-400",
  cancelado: "border-l-red-400",
};

/** Relógio que atualiza a cada 30s para os contadores de espera. */
function useNow(interval = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

function elapsed(iso: string, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  let text: string;
  if (min < 1) text = "agora mesmo";
  else if (min < 60) text = `há ${min} min`;
  else {
    const h = Math.floor(min / 60);
    const m = min % 60;
    text = `há ${h}h${m ? ` ${m}min` : ""}`;
  }
  return { min, text };
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ---------------- Card ----------------
function OrderCard({
  order,
  now,
  onOpen,
  onEdit,
}: {
  order: ManagedOrder;
  now: number;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const c = order.customer;
  const meta = STATUS_META[order.status];
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  const done = order.status === "entregue" || order.status === "cancelado";
  const { min, text } = elapsed(order.createdAt, now);
  const overdue = !done && min >= OVERDUE_MIN;
  const label = advanceLabel(order.status);

  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-l-4 bg-card p-4 transition-colors",
        overdue ? "border-red-500/60" : "border-border hover:border-neutral-700",
        LEFT_BORDER[order.status]
      )}
    >
      {/* topo: id + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold">#{order.id}</div>
          <div className="truncate text-sm text-muted-foreground">{c.name}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* contato + endereço */}
      <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0" /> {c.phone}
        </span>
        <span className="inline-flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="truncate">
            {c.street}, {c.number} · <span className="font-semibold text-foreground">{c.neighborhood}</span>
          </span>
        </span>
      </div>

      {/* meta: horário / itens / pagamento / tempo */}
      <div className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">
          <Clock className="mr-1 inline size-3.5 align-[-2px]" />
          {timeOf(order.createdAt)}
        </span>
        <span className="text-right text-muted-foreground">
          {count} {count === 1 ? "item" : "itens"} · {order.payment}
        </span>
        <span className={cn("font-semibold", overdue ? "text-red-400" : "text-muted-foreground")}>
          {done ? meta.label : text}
        </span>
        <span className="text-right font-display text-base font-extrabold text-foreground">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* botão principal de avanço (1 clique) ou indicador de concluído */}
      {label ? (
        <button
          type="button"
          onClick={() => advanceStatus(order.id)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99]"
        >
          {label} <ChevronRight className="size-4" />
        </button>
      ) : order.status === "entregue" ? (
        <div className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-400">
          <CheckCircle2 className="size-4" /> Pedido concluído
        </div>
      ) : (
        <div className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-lg bg-red-500/10 text-sm font-bold text-red-400">
          <X className="size-4" /> Pedido cancelado
        </div>
      )}

      {order.status === "cancelado" && order.cancelReason && (
        <p className="mt-2 text-xs text-muted-foreground">
          Motivo: <span className="text-foreground">{order.cancelReason}</span>
        </p>
      )}

      {/* ações rápidas */}
      {!confirming ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Eye className="size-4" /> Detalhes
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Editar pedido"
          >
            <Pencil className="size-4" />
          </button>
          {!done && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-500 hover:text-red-400"
              aria-label="Cancelar pedido"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/5 p-3">
          <div className="text-xs font-semibold text-foreground">Cancelar este pedido?</div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (ex.: cliente desistiu)"
            className="mt-2 h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setReason("");
              }}
              className="h-9 flex-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => {
                cancelOrder(order.id, reason);
                setConfirming(false);
                setReason("");
              }}
              className="h-9 flex-1 rounded-md bg-red-500 text-xs font-bold text-white transition-colors hover:bg-red-600 active:scale-[0.99]"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Page ----------------
/** OrdersPage — gestão de pedidos com avanço de status em 1 clique. */
export function OrdersPage() {
  const orders = useOrders();
  const now = useNow();
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, "");
    let list = orders.filter((o) => filter === "todos" || o.status === filter);
    if (q) {
      list = list.filter((o) => {
        const byText =
          o.id.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.customer.neighborhood.toLowerCase().includes(q);
        const byPhone = qDigits !== "" && o.customer.phone.replace(/\D/g, "").includes(qDigits);
        return byText || byPhone;
      });
    }
    return list;
  }, [orders, filter, query]);

  const sections = useMemo(() => {
    if (filter !== "todos") {
      return [{ label: FILTERS.find((f) => f.key === filter)?.label ?? "", items: filtered }];
    }
    return GROUPS.map((g) => ({
      label: g.label,
      items: filtered.filter((o) => g.statuses.includes(o.status)),
    })).filter((s) => s.items.length > 0);
  }, [filter, filtered]);

  const open = openId ? orders.find((o) => o.id === openId) ?? null : null;
  const editing = editId ? orders.find((o) => o.id === editId) ?? null : null;

  return (
    <main className="w-full max-w-[1500px] px-6 py-7 pb-12">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Pedidos</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Avance cada pedido com um clique — atualiza o cliente em tempo real
        </p>
      </div>

      {/* busca */}
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, número do pedido ou bairro..."
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
          />
        </div>
      </div>

      {/* filtros com contagem */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === f.key ? "bg-primary/20" : "bg-secondary")}>
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* seções */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((sec) => (
            <section key={sec.label}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{sec.label}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {sec.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sec.items.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    now={now}
                    onOpen={() => setOpenId(o.id)}
                    onEdit={() => setEditId(o.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}
      {editing && <OrderDetail order={editing} startEditing onClose={() => setEditId(null)} />}
    </main>
  );
}
