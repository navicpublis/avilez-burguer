import { type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useCatalog } from "@/hooks";
import {
  type Ingredient, UNIT_LABEL, CATEGORY_LABEL, MOVEMENT_LABEL,
  stockStatus, STATUS_LABEL, STATUS_TONE,
  listMovements, recentConsumers, recipesUsingIngredient,
} from "@/services/stock-store";

/** Página do ingrediente (drawer): quantidade, consumos recentes, histórico, receitas e fornecedor. */
export function IngredientDetail({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const catalog = useCatalog();
  if (!ingredient) return null;
  const st = stockStatus(ingredient);
  const movements = listMovements(ingredient.id).slice(0, 30);
  const consumers = recentConsumers(ingredient.id, 8);
  const usedIn = recipesUsingIngredient(ingredient.id);
  const pName = (id: string) => catalog.products.find((p) => p.id === id)?.name ?? id;
  const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card max-[860px]:max-w-full">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">{ingredient.name}</h2>
            <p className="text-sm text-muted-foreground">{CATEGORY_LABEL[ingredient.category]} · {ingredient.supplier || "sem fornecedor"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            <Box label="Quantidade atual" value={`${ingredient.qty} ${UNIT_LABEL[ingredient.unit]}`} />
            <Box label="Estoque mínimo" value={`${ingredient.minQty} ${UNIT_LABEL[ingredient.unit]}`} />
            <div className="rounded-xl border border-border bg-secondary p-3">
              <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Status</div>
              <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold", STATUS_TONE[st])}>{STATUS_LABEL[st]}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Box label="Preço de compra" value={formatCurrency(ingredient.buyPrice)} />
            <Box label="Valor em estoque" value={formatCurrency(ingredient.buyPrice * ingredient.qty)} />
          </div>
          {ingredient.note && <p className="rounded-lg border border-border bg-secondary p-3 text-sm text-muted-foreground">{ingredient.note}</p>}

          <Section title="Receitas onde é utilizado">
            {usedIn.length ? (
              <div className="flex flex-wrap gap-2">{usedIn.map((u) => <span key={u.productId} className="rounded-full border border-border bg-secondary px-3 py-1 text-sm">{pName(u.productId)} · {u.qty} {UNIT_LABEL[ingredient.unit]}</span>)}</div>
            ) : <Empty>Não está em nenhuma receita ainda.</Empty>}
          </Section>

          <Section title="Últimos produtos consumidos">
            {consumers.length ? (
              <ul className="space-y-1.5">{consumers.map((m) => <li key={m.id} className="flex justify-between text-sm"><span className="text-muted-foreground">Pedido {m.orderId}</span><span>-{m.qty} {UNIT_LABEL[ingredient.unit]} · {fmt(m.at)}</span></li>)}</ul>
            ) : <Empty>Nenhum consumo por pedido ainda.</Empty>}
          </Section>

          <Section title="Histórico de movimentações">
            {movements.length ? (
              <ul className="space-y-2">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                    <div><span className={cn("font-bold", m.type === "entrada" ? "text-emerald-400" : m.type === "ajuste" ? "text-sky-400" : "text-red-400")}>{MOVEMENT_LABEL[m.type]}</span> · <span className="text-muted-foreground">{m.reason}</span></div>
                    <div className="text-right text-muted-foreground">{m.type === "entrada" ? "+" : "-"}{m.qty}<div className="text-xs">{fmt(m.at)} · {m.user}</div></div>
                  </li>
                ))}
              </ul>
            ) : <Empty>Sem movimentações.</Empty>}
          </Section>
        </div>
      </aside>
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-secondary p-3"><div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-display font-bold">{value}</div></div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div><h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</div>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{children}</p>;
}
