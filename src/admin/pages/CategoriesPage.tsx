import { useMemo, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Pencil, Check, X, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useCatalog } from "@/hooks";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  updateProduct,
  listProducts,
} from "@/services/catalog-store";

/** Gestão de categorias — mesma fonte usada pela Landing e pelo cardápio. */
export function CategoriesPage() {
  const catalog = useCatalog();
  const cats = [...catalog.categories].sort((a, b) => a.order - b.order);

  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerCat, setPickerCat] = useState<string | null>(null);

  function flash(ok: boolean, msg: string) {
    setNotice({ ok, msg });
    window.setTimeout(() => setNotice(null), 3000);
  }

  function add() {
    const name = newName.trim();
    if (!name) {
      flash(false, "Informe o nome da categoria.");
      return;
    }
    const exists = catalog.categories.some((c) => c.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) {
      flash(false, "Essa categoria já existe.");
      return;
    }
    createCategory(name);
    setNewName("");
    flash(true, "Categoria criada com sucesso.");
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

  const productsByCat = useMemo(() => {
    const m = new Map<string, ReturnType<typeof listProducts>>();
    catalog.products.forEach((p) => m.set(p.categoryId, [...(m.get(p.categoryId) ?? []), p]));
    return m;
  }, [catalog.products]);

  function removeFromCategory(pid: string, pname: string) {
    if (confirm(`Remover "${pname}" desta categoria? O produto continua cadastrado, apenas fica sem categoria.`)) {
      updateProduct(pid, { categoryId: "" });
    }
  }

  function askDelete(id: string, name: string) {
    const count = (productsByCat.get(id) ?? []).length;
    if (count === 0) {
      if (confirm(`Excluir a categoria "${name}"?`)) deleteCategory(id);
      return;
    }
    const ok = confirm(
      `Esta categoria possui ${count} produto(s).\n\nOK = remover a categoria e deixar os produtos SEM categoria (eles continuam cadastrados).\nCancelar = manter a categoria.`
    );
    if (ok) {
      (productsByCat.get(id) ?? []).forEach((p) => updateProduct(p.id, { categoryId: "" }));
      deleteCategory(id);
    }
  }

  return (
    <main className="w-full max-w-[1100px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Categorias</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Usadas no cardápio e na Landing. Ocultar ou excluir nunca apaga os produtos.
        </p>
      </div>

      <div className="mb-2 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nome da nova categoria"
          className="h-11 flex-1 rounded-lg border border-border bg-card px-4 text-sm focus-visible:border-primary focus-visible:outline-none"
        />
        <button type="button" onClick={add} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.98]">
          <Plus className="size-4" /> Adicionar
        </button>
      </div>
      {notice && (
        <p className={cn("mb-4 text-sm font-medium", notice.ok ? "text-emerald-400" : "text-red-400")}>{notice.msg}</p>
      )}
      {!notice && <div className="mb-4" />}

      {cats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cats.map((c, i) => {
            const prods = productsByCat.get(c.id) ?? [];
            const expanded = expandedId === c.id;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card">
                {editId === c.id ? (
                  <div className="flex flex-col gap-2 p-4">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descrição curta (opcional)" className="h-10 rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditId(null)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-secondary"><X className="size-4" /> Cancelar</button>
                      <button type="button" onClick={saveEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-bold text-primary-foreground hover:bg-brand-yellow-soft"><Check className="size-4" /> Salvar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(c.id, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 hover:text-primary"><ChevronUp className="size-4" /></button>
                      <button type="button" onClick={() => move(c.id, 1)} disabled={i === cats.length - 1} className="text-muted-foreground disabled:opacity-30 hover:text-primary"><ChevronDown className="size-4" /></button>
                    </div>
                    <button type="button" onClick={() => setExpandedId(expanded ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-display font-bold", c.hidden && "text-muted-foreground line-through")}>{c.name}</span>
                          {c.hidden && <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">Oculta</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {prods.length} produto(s){c.description ? ` · ${c.description}` : ""}
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => updateCategory(c.id, { hidden: !c.hidden })} aria-label={c.hidden ? "Mostrar no site" : "Ocultar do site"} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
                      {c.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button type="button" onClick={() => startEdit(c.id, c.name, c.description)} aria-label="Editar" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => askDelete(c.id, c.name)} aria-label="Excluir" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-400">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}

                {expanded && editId !== c.id && (
                  <div className="border-t border-border p-4">
                    <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Produtos nesta categoria</div>
                    {prods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria ainda.</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-border">
                        {prods.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{formatCurrency(p.price)}</div>
                            </div>
                            <button type="button" onClick={() => removeFromCategory(p.id, p.name)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:border-red-500 hover:text-red-400">
                              <X className="size-3.5" /> Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => setPickerCat(c.id)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-primary/50 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
                      <Plus className="size-4" /> Adicionar produto à categoria
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pickerCat && (
        <ProductPicker
          categoryId={pickerCat}
          onClose={() => setPickerCat(null)}
        />
      )}
    </main>
  );
}

/** Seletor de produtos existentes para atribuir a uma categoria (multi-seleção). */
function ProductPicker({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const all = listProducts();
  const candidates = all.filter((p) => p.categoryId !== categoryId);
  const [sel, setSel] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function confirm() {
    sel.forEach((pid) => updateProduct(pid, { categoryId }));
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-lg font-bold">Adicionar à categoria</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os produtos já estão nesta categoria.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {candidates.map((p) => {
                const on = sel.has(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)} className={cn("flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors", on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border-2", on ? "border-primary bg-primary" : "border-border")}>
                      <Check className={cn("size-3 text-primary-foreground", on ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{formatCurrency(p.price)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border p-4">
          <button type="button" onClick={confirm} disabled={sel.size === 0} className="h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.99] disabled:opacity-50">
            Adicionar à categoria{sel.size > 0 ? ` (${sel.size})` : ""}
          </button>
        </div>
      </aside>
    </>
  );
}
