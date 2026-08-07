import { useMemo, useState } from "react";
import { Search, Phone, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useOrders } from "@/hooks";
import { buildCustomers, type CustomerSummary } from "@/services/customers";
import { StatusBadge } from "@/components/order/StatusBadge";

type Rank = "gasto" | "pedidos" | "recentes";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Clientes — agregados a partir dos pedidos reais (sem cadastro fictício). */
export function ClientsPage() {
  const orders = useOrders();
  const customers = useMemo(() => buildCustomers(orders), [orders]);

  const [query, setQuery] = useState("");
  const [rank, setRank] = useState<Rank>("gasto");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const qd = q.replace(/\D/g, "");
    let list = [...customers];
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (qd && c.phone.replace(/\D/g, "").includes(qd)));
    list.sort((a, b) => {
      if (rank === "pedidos") return b.orders - a.orders;
      if (rank === "recentes") return a.lastOrder < b.lastOrder ? 1 : -1;
      return b.totalSpent - a.totalSpent;
    });
    return list;
  }, [customers, query, rank]);

  const open = openKey ? customers.find((c) => c.key === openKey) ?? null : null;

  return (
    <main className="w-full max-w-[1200px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Clientes</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Baseado nos pedidos reais — {customers.length} cliente(s)</p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome ou telefone..." className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm focus-visible:border-primary focus-visible:outline-none" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {([["gasto", "Mais gastaram"], ["pedidos", "Mais pedidos"], ["recentes", "Mais recentes"]] as [Rank, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setRank(k)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", rank === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          {customers.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <button key={c.key} type="button" onClick={() => setOpenKey(c.key)} className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-neutral-700">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display font-bold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.phone}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-extrabold">{formatCurrency(c.totalSpent)}</div>
                  <div className="text-xs text-muted-foreground">{c.orders} pedido(s)</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Ticket médio</span><span className="text-right text-foreground">{formatCurrency(c.avgTicket)}</span>
                <span>Último pedido</span><span className="text-right text-foreground">{fmtDate(c.lastOrder)}</span>
                {c.topNeighborhood && (<><span>Bairro</span><span className="truncate text-right text-foreground">{c.topNeighborhood}</span></>)}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <CustomerDetail customer={open} onClose={() => setOpenKey(null)} />}
    </main>
  );
}

function CustomerDetail({ customer, onClose }: { customer: CustomerSummary; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">{customer.name}</div>
            <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Phone className="size-3.5" /> {customer.phone}</a>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            {[["Pedidos", String(customer.orders)], ["Total gasto", formatCurrency(customer.totalSpent)], ["Ticket médio", formatCurrency(customer.avgTicket)], ["Primeiro pedido", fmtDate(customer.firstOrder)], ["Produto favorito", customer.topProduct ?? "—"], ["Pagamento", customer.topPayment ?? "—"]].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-secondary p-3">
                <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-0.5 truncate text-sm font-semibold">{v}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Histórico de pedidos</div>
          <div className="flex flex-col divide-y divide-border">
            {customer.history.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="font-display text-sm font-bold">#{o.id}</span><StatusBadge status={o.status} /></div>
                  <div className="text-xs text-muted-foreground">{fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} itens</div>
                </div>
                <div className="shrink-0 font-display text-sm font-extrabold">{formatCurrency(o.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
