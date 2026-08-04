import { cn } from "@/lib/utils";
import { STATUS_META, type OrderStatus } from "@/services/order-status";

/** Badge de status (ícone/cor/rótulo). Reutilizável (admin + cliente). */
export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", m.badge, className)}>
      <span className="text-[0.9em] leading-none">{m.emoji}</span>
      {m.label}
    </span>
  );
}
