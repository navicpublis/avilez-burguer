import { StatCard } from "../components/StatCard";
import { WeekChart, RevenueChart, TopProducts } from "../components/Charts";
import { OrdersTable } from "../components/OrdersTable";
import { NotificationsList } from "../components/NotificationsList";
import { QuickActions } from "../components/QuickActions";
import { Card } from "../components/Card";
import { STATS } from "../admin-data";

/** Tela inicial do painel: resumo, gráficos, pedidos recentes e atividade. */
export function DashboardHome({ notify }: { notify: (msg: string) => void }) {
  return (
    <main className="w-full max-w-[1500px] px-6 py-7 pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Visão geral da operação · hoje</p>
        </div>
        <QuickActions onAction={(l) => notify(`${l} — em breve`)} />
      </div>

      <section className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <WeekChart />
        <RevenueChart />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card
          title="Pedidos recentes"
          action={
            <a href="#" onClick={(e) => { e.preventDefault(); notify("Ver todos — em breve"); }} className="text-sm text-primary hover:underline">
              Ver todos
            </a>
          }
        >
          <OrdersTable onAction={() => notify("Detalhes do pedido — em breve")} />
        </Card>
        <div className="min-w-0">
          <TopProducts />
          <Card title="Atividade">
            <NotificationsList />
          </Card>
        </div>
      </section>
    </main>
  );
}
