import { Card } from "./Card";
import { WEEK, REVENUE, TOP } from "../admin-data";

/** Placeholder de barras — pedidos da semana (sem dados reais ainda). */
export function WeekChart() {
  const max = Math.max(...WEEK.map((w) => w.value));
  return (
    <Card title="Pedidos da semana" preview>
      <div className="flex h-[150px] items-end gap-2.5 pt-2">
        {WEEK.map((w) => (
          <div key={w.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              className="w-full max-w-[2.4rem] rounded-t-md bg-gradient-to-b from-primary to-primary/35 transition-[height] duration-500"
              style={{ height: `${(w.value / max) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{w.day}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Placeholder de linha — faturamento. */
export function RevenueChart() {
  const max = Math.max(...REVENUE);
  const pts = REVENUE.map((v, i) => `${(i / (REVENUE.length - 1)) * 300},${100 - (v / max) * 80}`).join(" ");
  return (
    <Card title="Faturamento" preview>
      <svg className="h-[150px] w-full" viewBox="0 0 300 100" preserveAspectRatio="none">
        <polygon points={`0,100 ${pts} 300,100`} className="fill-primary/10" />
        <polyline points={pts} className="fill-none stroke-primary [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]" />
      </svg>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl font-extrabold">R$ 16.578</span>
        <span className="text-sm text-muted-foreground">nos últimos 7 dias</span>
      </div>
    </Card>
  );
}

/** Placeholder — produtos mais vendidos. */
export function TopProducts() {
  const max = Math.max(...TOP.map((t) => t.value));
  return (
    <Card title="Mais vendidos" preview className="mb-4">
      <div className="flex flex-col">
        {TOP.map((t) => (
          <div key={t.name} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 py-1.5">
            <span className="truncate text-sm">{t.name}</span>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(t.value / max) * 100}%` }} />
            </div>
            <span className="text-right font-display text-sm font-bold">{t.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
