import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

import { useCatalog, useStock } from "@/hooks";
import { UNIT_LABEL, setRecipe, type RecipeLine } from "@/services/stock-store";

/** Receita técnica por produto: liga ingredientes + quantidades a cada produto. */
export function RecipesManager({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog();
  const stock = useStock();
  const [productId, setProductId] = useState(catalog.products[0]?.id ?? "");
  const lines = stock.recipes[productId] ?? [];

  const ingName = (id: string) => stock.ingredients.find((i) => i.id === id)?.name ?? id;
  const ingUnit = (id: string) => { const i = stock.ingredients.find((x) => x.id === id); return i ? UNIT_LABEL[i.unit] : ""; };

  function addLine() {
    const first = stock.ingredients.find((i) => !lines.some((l) => l.ingredientId === i.id));
    if (!first) return;
    setRecipe(productId, [...lines, { ingredientId: first.id, qty: 1 }]);
  }
  function update(idx: number, patch: Partial<RecipeLine>) {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    setRecipe(productId, next);
  }
  function remove(idx: number) {
    setRecipe(productId, lines.filter((_, i) => i !== idx));
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card max-[860px]:max-w-full">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h2 className="font-display text-lg font-bold">Receita técnica</h2><p className="text-sm text-muted-foreground">O que cada produto consome do estoque</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div><div className="mb-1.5 text-[0.8rem] font-semibold">Produto</div>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-secondary px-3.5 focus-visible:border-primary focus-visible:outline-none">
              {catalog.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {lines.length === 0 && <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Sem receita — este produto não baixa estoque ao ser confirmado.</p>}
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-2.5">
                <select value={l.ingredientId} onChange={(e) => update(idx, { ingredientId: e.target.value })} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:outline-none">
                  {stock.ingredients.map((i) => <option key={i.id} value={i.id}>{ingName(i.id)}</option>)}
                </select>
                <input type="number" step="0.01" value={l.qty} onChange={(e) => update(idx, { qty: Number(e.target.value) })} className="h-10 w-20 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:outline-none" />
                <span className="w-14 text-xs text-muted-foreground">{ingUnit(l.ingredientId)}</span>
                <button type="button" onClick={() => remove(idx)} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-bold hover:border-primary"><Plus className="size-4 text-primary" /> Adicionar ingrediente</button>
          <p className="text-xs text-muted-foreground">As alterações são salvas automaticamente e passam a valer na próxima baixa.</p>
        </div>
      </aside>
    </>
  );
}
