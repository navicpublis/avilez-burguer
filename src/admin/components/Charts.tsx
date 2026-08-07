import { formatCurrency } from "@/utils/format";
import type { DayPoint } from "@/services/dashboard-metrics";

/** Estado vazio elegante reutilizável dos gráficos. */
function EmptyChart({ message }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
      {message ?? "Ainda não há dados suficientes para este período."}
    </div>
  );
}

/** Barras de pedidos por dia. */
export function OrdersPerDayChart({ data }: { data: DayPoint[] }) {
  const hasData = data.some((d) => d.orders > 0);
  if (!hasData) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.orders), 1);
  const show = data.slice(-14);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {show.map((d) => (
        <div key={d.iso} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80"
            style={{ height: `${(d.orders / max) * 100}%` }}
            title={`${d.label}: ${d.orders} pedido(s)`}
          />
          <span className="w-full truncate text-center text-[0.6rem] text-muted-foreground">{d.label.slice(0, 5)}</span>
        </div>
      ))}
    </div>
  );
}

/** Linha de faturamento por dia. */
export function RevenuePerDayChart({ data }: { data: DayPoint[] }) {
  const hasData = data.some((d) => d.revenue > 0);
  if (!hasData) return <EmptyChart />;
  const show = data.slice(-14);
  const max = Math.max(...show.map((d) => d.revenue), 1);
  const pts = show
    .map((d, i) => `${(i / Math.max(1, show.length - 1)) * 300},${100 - (d.revenue / max) * 80 - 10}`)
    .join(" ");
  const total = show.reduce((s, d) => s + d.revenue, 0);
  return (
    <div>
      <div className="mb-2 font-display text-xl font-extrabold">{formatCurrency(total)}</div>
      <svg viewBox="0 0 300 100" className="h-32 w-full" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Formas de pagamento (barras horizontais). */
export function PaymentChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart message="Nenhum pagamento registrado neste período." />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-semibold">{d.label}</span>
            <span className="text-muted-foreground">{d.value} · {Math.round((d.value / total) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Produtos mais vendidos. */
export function TopProductsChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyChart message="Nenhum produto vendido neste período." />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((t) => (
        <div key={t.name} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm">{t.name}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(t.value / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right font-display text-sm font-bold">{t.value}</span>
        </div>
      ))}
    </div>
  );
}
