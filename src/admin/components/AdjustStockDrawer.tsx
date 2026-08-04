import { useState } from "react";
import { X, Plus, Minus, Pencil, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Ingredient, type MovementType, UNIT_LABEL,
  addStock, removeStock, correctStock, registerLoss,
} from "@/services/stock-store";

type Mode = Exclude<MovementType, never>;
const MODES: { key: MovementType; label: string; icon: typeof Plus }[] = [
  { key: "entrada", label: "Adicionar", icon: Plus },
  { key: "saida", label: "Remover", icon: Minus },
  { key: "ajuste", label: "Corrigir", icon: Pencil },
  { key: "perda", label: "Perda", icon: AlertTriangle },
];

/** Ajuste manual de estoque (entrada / saída / correção / perda) com motivo. */
export function AdjustStockDrawer({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("entrada");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  if (!ingredient) return null;

  function apply() {
    if (!ingredient) return;
    const n = Number(String(qty).replace(",", "."));
    if (!Number.isFinite(n)) return;
    if (mode === "entrada") addStock(ingredient.id, n, reason);
    else if (mode === "saida") removeStock(ingredient.id, n, reason);
    else if (mode === "perda") registerLoss(ingredient.id, n, reason);
    else correctStock(ingredient.id, n, reason);
    onClose();
  }

  const isCorrect = mode === "ajuste";
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card max-[860px]:max-w-full">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h2 className="font-display text-lg font-bold">Ajustar estoque</h2><p className="text-sm text-muted-foreground">{ingredient.name} · atual: {ingredient.qty} {UNIT_LABEL[ingredient.unit]}</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button key={m.key} type="button" onClick={() => setMode(m.key)} className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors", mode === m.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                <m.icon className="size-4" /> {m.label}
              </button>
            ))}
          </div>
          <div><div className="mb-1.5 text-[0.8rem] font-semibold">{isCorrect ? "Nova quantidade" : "Quantidade"} ({UNIT_LABEL[ingredient.unit]})</div>
            <input type="number" step="0.01" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-secondary px-3.5 focus-visible:border-primary focus-visible:outline-none" placeholder={isCorrect ? String(ingredient.qty) : "0"} />
          </div>
          <div><div className="mb-1.5 text-[0.8rem] font-semibold">Motivo</div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-secondary px-3.5 focus-visible:border-primary focus-visible:outline-none" placeholder="Ex.: reposição, contagem, quebra..." />
          </div>
          <p className="text-xs text-muted-foreground">A movimentação fica registrada no histórico com data, hora e usuário.</p>
        </div>
        <footer className="border-t border-border p-4">
          <button type="button" onClick={apply} className="h-12 w-full rounded-lg bg-primary font-extrabold text-primary-foreground hover:bg-brand-yellow-soft">Registrar movimentação</button>
        </footer>
      </aside>
    </>
  );
}
