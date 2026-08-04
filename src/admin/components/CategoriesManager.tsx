import { useState } from "react";
import { X, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type Category,
  createCategory, updateCategory, deleteCategory, reorderCategories,
} from "@/services/catalog-store";

/** Gerenciador de categorias em drawer: criar, renomear, ocultar, excluir, reordenar (drag). */
export function CategoriesManager({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [drag, setDrag] = useState<string | null>(null);

  function onDrop(targetId: string) {
    if (!drag || drag === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(drag), to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderCategories(ids);
    setDrag(null);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Categorias</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" className="h-11 flex-1 rounded-lg border border-border bg-secondary px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
            <button type="button" onClick={() => { if (name.trim()) { createCategory(name.trim()); setName(""); } }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-brand-yellow-soft">
              <Plus className="size-4" /> Add
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={() => setDrag(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(c.id)}
                className={cn("flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5", drag === c.id && "opacity-50")}
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value.trim() && updateCategory(c.id, { name: e.target.value.trim() })}
                  className={cn("min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none", c.hidden && "text-muted-foreground line-through")}
                />
                <button type="button" title={c.hidden ? "Mostrar" : "Ocultar"} onClick={() => updateCategory(c.id, { hidden: !c.hidden })} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
                  {c.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button type="button" title="Excluir" onClick={() => deleteCategory(c.id)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-400">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
