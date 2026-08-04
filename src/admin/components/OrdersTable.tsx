import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { RECENT_ORDERS, STATUS_CLASSES } from "../admin-data";

/** Tabela de pedidos recentes (estrutura). */
export function OrdersTable({ onAction }: { onAction?: (id: string) => void }) {
  return (
    <div className="-mx-1.5 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr>
            {["Número", "Cliente", "Valor", "Status", "Horário", "Ações"].map((h) => (
              <th key={h} className="border-b border-border px-3 py-2.5 text-left text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RECENT_ORDERS.map((o) => (
            <tr key={o.id} className="transition-colors hover:bg-secondary">
              <td className="border-b border-border px-3 py-3 font-display text-sm">#{o.id}</td>
              <td className="border-b border-border px-3 py-3 text-sm">{o.customer}</td>
              <td className="border-b border-border px-3 py-3 font-display text-sm">{o.value}</td>
              <td className="border-b border-border px-3 py-3">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-bold", STATUS_CLASSES[o.status])}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {o.statusLabel}
                </span>
              </td>
              <td className="border-b border-border px-3 py-3 text-sm text-muted-foreground">{o.time}</td>
              <td className="border-b border-border px-3 py-3">
                <button
                  type="button"
                  onClick={() => onAction?.(o.id)}
                  aria-label={`Ver pedido ${o.id}`}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Eye className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
