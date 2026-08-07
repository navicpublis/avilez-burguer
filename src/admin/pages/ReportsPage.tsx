import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useOrders, useStock } from "@/hooks";
import {
  type Period,
  PERIOD_OPTIONS,
  filterByPeriod,
  computeMetrics,
  paymentBreakdown,
  topProducts,
} from "@/services/dashboard-metrics";
import { buildCustomers } from "@/services/customers";
import { stockStatus } from "@/services/stock-store";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ data, fmt }: { data: { label: string; value: string }[]; fmt?: boolean }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate text-muted-foreground">{d.label}</span>
          <span className={cn("shrink-0 font-semibold", fmt && "font-display")}>{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Relatórios — todos os números vêm dos dados locais reais. */
export function ReportsPage() {
  const orders = useOrders();
  const stock = useStock();
  const [period, setPeriod] = useState<Period>({ key: "30d" });

  const list = useMemo(() => filterByPeriod(orders, period), [orders, period]);
  const metrics = useMemo(() => computeMetrics(list), [list]);
  const valid = useMemo(() => list.filter((o) => o.status !== "cancelado"), [list]);

  const discounts = valid.reduce((s, o) => s + o.discount, 0);
  const fees = valid.reduce((s, o) => s + o.fee, 0);
  const gross = valid.reduce((s, o) => s + o.subtotal, 0);

  const payments = useMemo(() => paymentBreakdown(list), [list]);
  const tops = useMemo(() => topProducts(list, 100), [list]);
  const custs = useMemo(() => buildCustomers(list), [list]);

  // entregas por bairro
  const byHood = useMemo(() => {
    const m = new Map<string, number>();
    valid.forEach((o) => m.set(o.customer.neighborhood || "—", (m.get(o.customer.neighborhood || "—") ?? 0) + 1));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [valid]);
  const avgFee = valid.length ? fees / valid.length : 0;

  // estoque
  const movs = stock.movements.filter((mv) => {
    const t = new Date(mv.at).getTime();
    const from = period.key === "tudo" ? 0 : Date.now() - (period.key === "hoje" ? 1 : period.key === "7d" ? 7 : period.key === "90d" ? 90 : 30) * 86400000;
    return t >= from;
  });
  const consumo = useMemo(() => {
    const m = new Map<string, number>();
    movs.filter((x) => x.type === "saida").forEach((x) => m.set(x.ingredientId, (m.get(x.ingredientId) ?? 0) + x.qty));
    return [...m.entries()].map(([id, qty]) => ({ name: stock.ingredients.find((i) => i.id === id)?.name ?? id, qty })).sort((a, b) => b.qty - a.qty);
  }, [movs, stock.ingredients]);
  const perdas = movs.filter((x) => x.type === "perda").length;
  const ajustes = movs.filter((x) => x.type === "ajuste").length;
  const stockCost = stock.ingredients.reduce((s, i) => s + i.qty * i.buyPrice, 0);
  const lowItems = stock.ingredients.filter((i) => stockStatus(i) !== "ok");

  return (
    <main className="w-full max-w-[1300px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-5">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Relatórios</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Todos os números vêm dos pedidos e do estoque reais.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.filter((p) => p.key !== "custom").map((p) => (
          <button key={p.key} type="button" onClick={() => setPeriod({ key: p.key })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", period.key === p.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>{p.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Faturamento">
          <Rows fmt data={[
            { label: "Total bruto (produtos)", value: formatCurrency(gross) },
            { label: "Descontos", value: `- ${formatCurrency(discounts)}` },
            { label: "Taxas de entrega", value: formatCurrency(fees) },
            { label: "Faturamento líquido", value: formatCurrency(metrics.revenue) },
            { label: "Ticket médio", value: metrics.avgTicket === null ? "Sem dados" : formatCurrency(metrics.avgTicket) },
            { label: "Pedidos", value: String(metrics.orders) },
          ]} />
        </Section>

        <Section title="Pagamentos">
          <Rows data={payments.map((p) => ({ label: p.label, value: `${p.value} pedido(s)` }))} />
          {payments.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Mais usado: <span className="text-foreground">{payments[0].label}</span>
              {payments.length > 1 && <> · Menos usado: <span className="text-foreground">{payments[payments.length - 1].label}</span></>}
            </div>
          )}
        </Section>

        <Section title="Produtos mais vendidos">
          <Rows data={tops.slice(0, 8).map((t) => ({ label: t.name, value: `${t.value} un.` }))} />
        </Section>

        <Section title="Produtos menos vendidos">
          <Rows data={[...tops].reverse().slice(0, 8).map((t) => ({ label: t.name, value: `${t.value} un.` }))} />
        </Section>

        <Section title="Clientes que mais gastaram">
          <Rows fmt data={[...custs].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 8).map((c) => ({ label: c.name, value: formatCurrency(c.totalSpent) }))} />
        </Section>

        <Section title="Clientes que mais compraram">
          <Rows data={[...custs].sort((a, b) => b.orders - a.orders).slice(0, 8).map((c) => ({ label: c.name, value: `${c.orders} pedido(s)` }))} />
        </Section>

        <Section title="Entregas por bairro">
          <Rows data={byHood.map((h) => ({ label: h.label, value: `${h.value} pedido(s)` }))} />
          {valid.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Taxa média: <span className="text-foreground">{formatCurrency(avgFee)}</span> · Tempo médio: <span className="text-foreground">{metrics.avgDeliveryMin === null ? "—" : `${metrics.avgDeliveryMin} min`}</span>
            </div>
          )}
        </Section>

        <Section title="Estoque">
          <Rows data={[
            { label: "Ingredientes mais consumidos", value: consumo[0]?.name ?? "—" },
            { label: "Perdas registradas", value: String(perdas) },
            { label: "Ajustes registrados", value: String(ajustes) },
            { label: "Custo estimado em estoque", value: formatCurrency(stockCost) },
            { label: "Itens no/abaixo do mínimo", value: String(lowItems.length) },
          ]} />
        </Section>
      </div>
    </main>
  );
}
