import { Eye } from "lucide-react";

import { formatCurrency } from "@/utils/format";
import type { ManagedOrder } from "@/services/orders-store";
import { StatusBadge } from "@/components/order/StatusBadge";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Tabela de pedidos recentes (dados reais). */
export function OrdersTable({
  orders,
  onOpen,
}: {
  orders: ManagedOrder[];
  onOpen: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum pedido registrado até o momento.
      </p>
    );
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {orders.map((o) => (
        <div key={o.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold">#{o.id}</span>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {o.customer.name} · {timeOf(o.createdAt)} · {o.payment}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-sm font-extrabold">{formatCurrency(o.total)}</div>
          </div>
          <button
            type="button"
            onClick={() => onOpen(o.id)}
            aria-label={`Ver pedido ${o.id}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Eye className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
