import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import {
  type Ingredient, type IngredientInput, type IngredientCategory, type StockUnit,
  CATEGORY_LABEL, UNIT_LABEL, createIngredient, updateIngredient,
} from "@/services/stock-store";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as IngredientCategory[];
const UNITS = Object.keys(UNIT_LABEL) as StockUnit[];

function empty(): IngredientInput {
  return { name: "", category: "outros", supplier: "", qty: 0, minQty: 0, unit: "un", buyPrice: 0, note: "" };
}

/** Cadastro/edição de ingrediente em drawer lateral. */
export function IngredientDrawer({ ingredient, onClose }: { ingredient: Ingredient | "new" | null; onClose: () => void }) {
  const editing = ingredient && ingredient !== "new" ? ingredient : null;
  const [form, setForm] = useState<IngredientInput>(empty());

  useEffect(() => {
    if (ingredient === "new") setForm(empty());
    else if (ingredient) { const { id: _id, ...rest } = ingredient; void _id; setForm(rest); }
  }, [ingredient]);

  if (ingredient === null) return null;
  const set = <K extends keyof IngredientInput>(k: K, v: IngredientInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    if (!form.name.trim()) return;
    if (editing) updateIngredient(editing.id, form);
    else createIngredient(form);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card max-[860px]:max-w-full">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">{editing ? "Editar ingrediente" : "Novo ingrediente"}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Nome"><input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Pão Brioche" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria"><select className={inp} value={form.category} onChange={(e) => set("category", e.target.value as IngredientCategory)}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</select></Field>
            <Field label="Unidade"><select className={inp} value={form.unit} onChange={(e) => set("unit", e.target.value as StockUnit)}>{UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></Field>
          </div>
          <Field label="Fornecedor"><input className={inp} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Ex.: Padaria Central" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade atual"><input type="number" step="0.01" className={inp} value={form.qty || ""} onChange={(e) => set("qty", Number(e.target.value))} /></Field>
            <Field label="Quantidade mínima"><input type="number" step="0.01" className={inp} value={form.minQty || ""} onChange={(e) => set("minQty", Number(e.target.value))} /></Field>
          </div>
          <Field label="Preço de compra (R$)"><input type="number" step="0.01" className={inp} value={form.buyPrice || ""} onChange={(e) => set("buyPrice", Number(e.target.value))} /></Field>
          <Field label="Observação"><textarea className={`${inp} min-h-20 py-2`} value={form.note} onChange={(e) => set("note", e.target.value)} /></Field>
        </div>
        <footer className="border-t border-border p-4">
          <button type="button" onClick={save} disabled={!form.name.trim()} className="h-12 w-full rounded-lg bg-primary font-extrabold text-primary-foreground hover:bg-brand-yellow-soft disabled:opacity-50">
            {editing ? "Salvar alterações" : "Criar ingrediente"}
          </button>
        </footer>
      </aside>
    </>
  );
}

const inp = "h-11 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.92rem] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><div className="mb-1.5 text-[0.8rem] font-semibold">{label}</div>{children}</div>;
}
