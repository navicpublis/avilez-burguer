import { cn } from "@/lib/utils";
import {
  STATUS_FLOW,
  STATUS_META,
  TIMELINE_LABELS,
  type OrderStatus,
} from "@/services/order-status";
import type { StatusEvent } from "@/services/orders-store";

function timeOf(history: StatusEvent[] | undefined, status: OrderStatus): string | null {
  const ev = history?.find((h) => h.status === status);
  if (!ev) return null;
  return new Date(ev.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * OrderTimeline — linha do tempo do pedido (Recebido → … → Finalizado).
 * Destaca o status atual e marca as etapas já concluídas.
 */
export function OrderTimeline({
  status,
  history,
}: {
  status: OrderStatus;
  history?: StatusEvent[];
}) {
  if (status === "cancelado") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-400">
        <span className="text-lg">🔴</span>
        <div>
          <div className="font-bold">Pedido cancelado</div>
          <div className="text-sm opacity-80">{timeOf(history, "cancelado") ?? ""}</div>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_FLOW.indexOf(status);

  return (
    <ol className="relative">
      {STATUS_FLOW.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const meta = STATUS_META[s];
        const t = timeOf(history, s);
        const last = i === STATUS_FLOW.length - 1;
        return (
          <li key={s} className="flex gap-3.5">
            {/* trilho + ponto */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done && "border-transparent " + meta.solid,
                  active && "border-transparent " + meta.solid,
                  !done && !active && "border-border bg-card"
                )}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="size-4 stroke-black" fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : active ? (
                  <span className="size-2.5 rounded-full bg-black" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              {!last && <span className={cn("w-0.5 flex-1", i < currentIdx ? meta.solid : "bg-border")} style={{ minHeight: "1.75rem" }} />}
            </div>
            {/* rótulo */}
            <div className={cn("pb-6", last && "pb-0")}>
              <div className={cn("font-bold leading-tight", active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground")}>
                {TIMELINE_LABELS[s]}
              </div>
              {t && <div className="text-xs text-muted-foreground">{t}</div>}
              {active && <div className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
