import { useMemo, useState } from "react";
import { Receipt, DollarSign, Flame, Check, Ticket, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useOrders, useCatalog } from "@/hooks";
import {
  type Period,
  PERIOD_OPTIONS,
  filterByPeriod,
  computeMetrics,
  dailySeries,
  paymentBreakdown,
  topProducts,
} from "@/services/dashboard-metrics";
import { StatCard } from "../components/StatCard";
import {
  OrdersPerDayChart,
  RevenuePerDayChart,
  PaymentChart,
  TopProductsChart,
} from "../components/Charts";
import { OrdersTable } from "../components/OrdersTable";
import { NotificationsList } from "../components/NotificationsList";
import { QuickActions } from "../components/QuickActions";
import { Card } from "../components/Card";
import { ProductDrawer } from "../components/ProductDrawer";
import { CouponDrawer } from "../components/CouponDrawer";
import { ManualOrderDrawer } from "../components/ManualOrderDrawer";
import { OrderDetail } from "../components/OrderDetail";

function fmtDuration(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m ? ` ${m}min` : ""}`;
}

/** Tela inicial do painel: métricas reais por período, gráficos e atalhos. */
export function DashboardHome({
  notify,
  onNavigate,
}: {
  notify: (msg: string) => void;
  onNavigate: (key: string) => void;
}) {
  const orders = useOrders();
  const catalog = useCatalog();

  const [period, setPeriod] = useState<Period>({ key: "hoje" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const filtered = useMemo(() => filterByPeriod(orders, period), [orders, period]);
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);
  const series = useMemo(() => dailySeries(filtered, period), [filtered, period]);
  const payments = useMemo(() => paymentBreakdown(filtered), [filtered]);
  const tops = useMemo(() => topProducts(filtered), [filtered]);
  const recent = useMemo(() => filtered.slice(0, 8), [filtered]);

  const open = openId ? orders.find((o) => o.id === openId) ?? null : null;

  const cards = [
    { icon: Receipt, value: String(metrics.orders), label: "Pedidos no período" },
    { icon: DollarSign, value: formatCurrency(metrics.revenue), label: "Faturamento" },
    { icon: Flame, value: String(metrics.inProduction), label: "Em produção" },
    { icon: Check, value: String(metrics.delivered), label: "Entregues" },
    { icon: Ticket, value: metrics.avgTicket === null ? "Sem dados" : formatCurrency(metrics.avgTicket), label: "Ticket médio" },
    { icon: Clock, value: fmtDuration(metrics.avgDeliveryMin), label: "Tempo médio de entrega" },
  ];

  return (
    <main className="w-full max-w-[1500px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Visão geral da operação — dados reais</p>
        </div>
        <QuickActions
          onNewProduct={() => setProductOpen(true)}
          onNewOrder={() => setManualOpen(true)}
          onAdjustStock={() => onNavigate("estoque")}
          onNewCoupon={() => setCouponOpen(true)}
        />
      </div>

      {/* seletor de período */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod((prev) => ({ ...prev, key: p.key }))}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              period.key === p.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {p.label}
          </button>
        ))}
        {period.key === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={period.from ?? ""}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input
              type="date"
              value={period.to ?? ""}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
        )}
      </div>

      {/* cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.label} icon={c.icon} value={c.value} label={c.label} />
        ))}
      </section>

      {/* gráficos */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Pedidos por dia">
          <OrdersPerDayChart data={series} />
        </Card>
        <Card title="Faturamento por dia">
          <RevenuePerDayChart data={series} />
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Formas de pagamento">
          <PaymentChart data={payments} />
        </Card>
        <Card title="Produtos mais vendidos">
          <TopProductsChart data={tops} />
        </Card>
      </section>

      {/* pedidos recentes + notificações */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Pedidos recentes">
          <OrdersTable orders={recent} onOpen={(id) => setOpenId(id)} />
        </Card>
        <Card title="Notificações">
          <NotificationsList />
        </Card>
      </section>

      {/* drawers e detalhes */}
      {productOpen && (
        <ProductDrawer
          product="new"
          categories={catalog.categories}
          groups={catalog.groups}
          onClose={() => setProductOpen(false)}
        />
      )}
      <CouponDrawer open={couponOpen} onClose={() => setCouponOpen(false)} onSaved={(code) => notify(`Cupom ${code} criado`)} />
      <ManualOrderDrawer open={manualOpen} onClose={() => setManualOpen(false)} onSaved={(id) => notify(`Pedido ${id} criado`)} />
      {open && <OrderDetail order={open} onClose={() => setOpenId(null)} />}
    </main>
  );
}
