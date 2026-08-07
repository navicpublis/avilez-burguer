import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCatalog } from "@/hooks";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  listProducts,
} from "@/services/catalog-store";

/** Gestão de categorias — mesma fonte usada pela Landing e pelo cardápio. */
export function CategoriesPage() {
  const catalog = useCatalog();
  const cats = [...catalog.categories].sort((a, b) => a.order - b.order);

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function add() {
    const name = newName.trim();
    if (!name) return;
    createCategory(name);
    setNewName("");
  }

  function move(id: string, dir: -1 | 1) {
    const ids = cats.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderCategories(ids);
  }

  function startEdit(id: string, name: string, description?: string) {
    setEditId(id);
    setEditName(name);
    setEditDesc(description ?? "");
  }
  function saveEdit() {
    if (!editId) return;
    updateCategory(editId, { name: editName.trim() || "Categoria", description: editDesc.trim() });
    setEditId(null);
  }

  function productCount(catId: string): number {
    return listProducts().filter((p) => p.categoryId === catId).length;
  }

  return (
    <main className="w-full max-w-[1100px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Categorias</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Usadas no cardápio e na Landing. Ocultar não apaga os produtos.
        </p>
      </div>

      {/* nova categoria */}
      <div className="mb-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nome da nova categoria"
          className="h-11 flex-1 rounded-lg border border-border bg-card px-4 text-sm focus-visible:border-primary focus-visible:outline-none"
        />
        <button type="button" onClick={add} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.98]">
          <Plus className="size-4" /> Adicionar
        </button>
      </div>

      {cats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              {editId === c.id ? (
                <div className="flex flex-col gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
                  <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descrição curta (opcional)" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditId(null)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary"><X className="size-4" /> Cancelar</button>
                    <button type="button" onClick={saveEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-bold text-primary-foreground hover:bg-brand-yellow-soft"><Check className="size-4" /> Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(c.id, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 hover:text-primary"><ChevronUp className="size-4" /></button>
                    <button type="button" onClick={() => move(c.id, 1)} disabled={i === cats.length - 1} className="text-muted-foreground disabled:opacity-30 hover:text-primary"><ChevronDown className="size-4" /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-display font-bold", c.hidden && "text-muted-foreground line-through")}>{c.name}</span>
                      {c.hidden && <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">Oculta</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {productCount(c.id)} produto(s){c.description ? ` · ${c.description}` : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => updateCategory(c.id, { hidden: !c.hidden })} aria-label={c.hidden ? "Mostrar no site" : "Ocultar do site"} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
                    {c.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button type="button" onClick={() => startEdit(c.id, c.name, c.description)} aria-label="Editar" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => { if (confirm(`Excluir a categoria "${c.name}"? Os produtos não serão apagados.`)) deleteCategory(c.id); }} aria-label="Excluir" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-400">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
