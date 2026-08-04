import { useMemo, useState, type ReactNode } from "react";
import {
  Search, Plus, Table2, LayoutGrid, GripVertical, Copy, Pencil, Trash2,
  Eye, EyeOff, ImageOff, FolderTree, Layers,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useCatalog } from "@/hooks";
import {
  type CatalogProduct, type ProductStatus,
  STATUS_LABEL, STATUS_TONE, BADGE_LABEL,
  duplicateProduct, deleteProduct, setProductStatus, reorderProducts,
} from "@/services/catalog-store";
import { ProductDrawer } from "../components/ProductDrawer";
import { CategoriesManager } from "../components/CategoriesManager";
import { GroupsManager } from "../components/GroupsManager";

type View = "tabela" | "cards";
type SortKey = "ordem" | "nome" | "preco_asc" | "preco_desc";

export function ProductsPage() {
  const catalog = useCatalog();
  const [view, setView] = useState<View>("tabela");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [flag, setFlag] = useState<"todos" | "mais_vendido" | "promocao">("todos");
  const [sort, setSort] = useState<SortKey>("ordem");
  const [drawer, setDrawer] = useState<CatalogProduct | "new" | null>(null);
  const [manageCats, setManageCats] = useState(false);
  const [manageGroups, setManageGroups] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);

  const catName = (id: string) => catalog.categories.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = [...catalog.products];
    if (cat !== "todas") list = list.filter((p) => p.categoryId === cat);
    if (status !== "todos") list = list.filter((p) => p.status === status);
    if (flag === "mais_vendido") list = list.filter((p) => p.badges.includes("mais_vendido"));
    if (flag === "promocao") list = list.filter((p) => p.badges.includes("promocao") || p.promoPrice);
    if (q) list = list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      catName(p.categoryId).toLowerCase().includes(q) ||
      p.ingredients.some((i) => i.toLowerCase().includes(q))
    );
    list.sort((a, b) => {
      if (sort === "nome") return a.name.localeCompare(b.name);
      if (sort === "preco_asc") return a.price - b.price;
      if (sort === "preco_desc") return b.price - a.price;
      return a.order - b.order;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, query, cat, status, flag, sort]);

  const canDrag = sort === "ordem" && !query && flag === "todos";
  function onDrop(targetId: string) {
    if (!drag || drag === targetId || !canDrag) return;
    const ids = filtered.map((p) => p.id);
    const from = ids.indexOf(drag), to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderProducts(ids);
    setDrag(null);
  }

  return (
    <main className="w-full max-w-[1500px] px-6 py-7 pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Produtos</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Monte e organize o cardápio da Avilez Burguer</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setManageCats(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-bold hover:border-primary"><FolderTree className="size-4 text-primary" /> Categorias</button>
          <button type="button" onClick={() => setManageGroups(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-bold hover:border-primary"><Layers className="size-4 text-primary" /> Adicionais</button>
          <button type="button" onClick={() => setDrawer("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-extrabold text-primary-foreground hover:bg-brand-yellow-soft"><Plus className="size-4" /> Novo Produto</button>
        </div>
      </div>

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, categoria ou ingrediente..." className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selCls}>
          <option value="todas">Todas categorias</option>
          {catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selCls}>
          <option value="todos">Todos status</option>
          {(Object.keys(STATUS_LABEL) as ProductStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selCls}>
          <option value="ordem">Ordem do cardápio</option>
          <option value="nome">Nome (A-Z)</option>
          <option value="preco_asc">Menor preço</option>
          <option value="preco_desc">Maior preço</option>
        </select>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button type="button" onClick={() => setView("tabela")} className={cn("flex size-11 items-center justify-center", view === "tabela" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}><Table2 className="size-5" /></button>
          <button type="button" onClick={() => setView("cards")} className={cn("flex size-11 items-center justify-center", view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}><LayoutGrid className="size-5" /></button>
        </div>
      </div>

      {/* filtros rápidos */}
      <div className="mb-5 flex flex-wrap gap-2">
        {([["todos", "Todos"], ["mais_vendido", "Mais vendidos"], ["promocao", "Promoção"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFlag(k)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", flag === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>{label}</button>
        ))}
        <span className="ml-auto self-center text-sm text-muted-foreground">{filtered.length} produto(s)</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">Nenhum produto encontrado.</div>
      ) : view === "tabela" ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                {["", "Imagem", "Nome", "Categoria", "Preço", "Status", "Selos", "Ações"].map((h, i) => (
                  <th key={i} className="px-3 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  draggable={canDrag}
                  onDragStart={() => canDrag && setDrag(p.id)}
                  onDragOver={(e) => canDrag && e.preventDefault()}
                  onDrop={() => onDrop(p.id)}
                  className={cn("border-t border-border transition-colors hover:bg-secondary/50", drag === p.id && "opacity-50")}
                >
                  <td className="px-3 py-2.5">{canDrag && <GripVertical className="size-4 cursor-grab text-muted-foreground" />}</td>
                  <td className="px-3 py-2.5"><Thumb p={p} /></td>
                  <td className="px-3 py-2.5"><div className="font-bold">{p.name}</div><div className="max-w-[220px] truncate text-xs text-muted-foreground">{p.shortDesc}</div></td>
                  <td className="px-3 py-2.5 text-sm text-muted-foreground">{catName(p.categoryId)}</td>
                  <td className="px-3 py-2.5"><Price p={p} /></td>
                  <td className="px-3 py-2.5"><StatusPill status={p.status} /></td>
                  <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{p.badges.map((b) => <span key={b} className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.68rem] font-bold text-primary">{BADGE_LABEL[b]}</span>)}</div></td>
                  <td className="px-3 py-2.5"><Actions p={p} onEdit={() => setDrawer(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              draggable={canDrag}
              onDragStart={() => canDrag && setDrag(p.id)}
              onDragOver={(e) => canDrag && e.preventDefault()}
              onDrop={() => onDrop(p.id)}
              className={cn("flex min-w-0 gap-3 rounded-2xl border border-border bg-card p-3.5", drag === p.id && "opacity-50")}
            >
              <Thumb p={p} big />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-bold">{p.name}</div><div className="text-xs text-muted-foreground">{catName(p.categoryId)}</div></div>
                  <StatusPill status={p.status} />
                </div>
                <div className="mt-1.5"><Price p={p} /></div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{p.badges.slice(0, 2).map((b) => <span key={b} className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.66rem] font-bold text-primary">{BADGE_LABEL[b]}</span>)}</div>
                  <Actions p={p} onEdit={() => setDrawer(p)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductDrawer product={drawer} categories={catalog.categories} groups={catalog.groups} onClose={() => setDrawer(null)} />
      {manageCats && <CategoriesManager categories={[...catalog.categories].sort((a, b) => a.order - b.order)} onClose={() => setManageCats(false)} />}
      {manageGroups && <GroupsManager groups={[...catalog.groups].sort((a, b) => a.order - b.order)} onClose={() => setManageGroups(false)} />}
    </main>
  );
}

const selCls = "h-11 rounded-lg border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

function Thumb({ p, big }: { p: CatalogProduct; big?: boolean }) {
  const size = big ? "size-16" : "size-11";
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary", size)}>
      {p.image ? <img src={p.image} alt="" className="size-full object-cover" /> : <ImageOff className="size-5 text-muted-foreground" />}
    </div>
  );
}
function Price({ p }: { p: CatalogProduct }) {
  return p.promoPrice ? (
    <div className="leading-tight"><span className="text-xs text-muted-foreground line-through">{formatCurrency(p.price)}</span><div className="font-display font-bold text-primary">{formatCurrency(p.promoPrice)}</div></div>
  ) : (
    <span className="font-display font-bold">{formatCurrency(p.price)}</span>
  );
}
function StatusPill({ status }: { status: ProductStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}
function Actions({ p, onEdit }: { p: CatalogProduct; onEdit: () => void }) {
  const hidden = p.status === "oculto";
  return (
    <div className="flex items-center gap-1">
      <IconBtn title="Editar" onClick={onEdit}><Pencil className="size-4" /></IconBtn>
      <IconBtn title="Duplicar" onClick={() => duplicateProduct(p.id)}><Copy className="size-4" /></IconBtn>
      <IconBtn title={hidden ? "Mostrar" : "Ocultar"} onClick={() => setProductStatus(p.id, hidden ? "disponivel" : "oculto")}>{hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</IconBtn>
      <IconBtn title="Excluir" danger onClick={() => deleteProduct(p.id)}><Trash2 className="size-4" /></IconBtn>
    </div>
  );
}
function IconBtn({ children, title, onClick, danger }: { children: ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} className={cn("flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors", danger ? "hover:border-red-400 hover:text-red-400" : "hover:border-primary hover:text-primary")}>
      {children}
    </button>
  );
}
