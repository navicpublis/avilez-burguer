import { useMemo, useState, type ReactNode } from "react";
import {
  Search, Plus, Package, AlertTriangle, XCircle, ShoppingBag, Clock,
  SlidersHorizontal, Eye, Pencil, Trash2, BookOpen, Bell, BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useStock } from "@/hooks";
import {
  type Ingredient, type IngredientCategory,
  CATEGORY_LABEL, UNIT_LABEL, stockStatus, STATUS_LABEL, STATUS_TONE,
  listMovements, stockNotifications, lastUpdatedAt, deleteIngredient,
} from "@/services/stock-store";
import { IngredientDrawer } from "../components/IngredientDrawer";
import { AdjustStockDrawer } from "../components/AdjustStockDrawer";
import { IngredientDetail } from "../components/IngredientDetail";
import { RecipesManager } from "../components/RecipesManager";

type FlagFilter = "todos" | "baixo" | "zerado" | "consumidos";

export function StockPage() {
  const stock = useStock();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("todas");
  const [supplier, setSupplier] = useState("todos");
  const [flag, setFlag] = useState<FlagFilter>("todos");
  const [drawer, setDrawer] = useState<Ingredient | "new" | null>(null);
  const [adjust, setAdjust] = useState<Ingredient | null>(null);
  const [detail, setDetail] = useState<Ingredient | null>(null);
  const [recipes, setRecipes] = useState(false);

  const suppliers = useMemo(() => Array.from(new Set(stock.ingredients.map((i) => i.supplier).filter(Boolean))), [stock]);
  const notifications = stockNotifications();
  const updatedAt = lastUpdatedAt();

  // contagem de consumo por ingrediente (p/ "mais consumidos")
  const consumed = useMemo(() => {
    const m = new Map<string, number>();
    for (const mov of stock.movements) if (mov.orderId) m.set(mov.ingredientId, (m.get(mov.ingredientId) ?? 0) + mov.qty);
    return m;
  }, [stock]);

  const cards = useMemo(() => {
    let ok = 0, baixo = 0, zerado = 0;
    for (const i of stock.ingredients) { const s = stockStatus(i); if (s === "ok") ok++; else if (s === "baixo") baixo++; else zerado++; }
    return { ok, baixo, zerado };
  }, [stock]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = [...stock.ingredients];
    if (cat !== "todas") list = list.filter((i) => i.category === cat);
    if (supplier !== "todos") list = list.filter((i) => i.supplier === supplier);
    if (flag === "baixo") list = list.filter((i) => stockStatus(i) === "baixo");
    if (flag === "zerado") list = list.filter((i) => stockStatus(i) === "zerado");
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q) || CATEGORY_LABEL[i.category].toLowerCase().includes(q));
    if (flag === "consumidos") list.sort((a, b) => (consumed.get(b.id) ?? 0) - (consumed.get(a.id) ?? 0));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [stock, query, cat, supplier, flag, consumed]);

  const lastMovOf = (id: string) => { const m = listMovements(id)[0]; return m ? new Date(m.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; };

  return (
    <main className="w-full max-w-[1500px] px-6 py-7 pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Estoque</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Controle por ingredientes com baixa automática ao confirmar pedidos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRecipes(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2.5 text-sm font-bold hover:border-primary"><BookOpen className="size-4 text-primary" /> Receitas</button>
          <button type="button" onClick={() => setDrawer("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-extrabold text-primary-foreground hover:bg-brand-yellow-soft"><Plus className="size-4" /> Novo Ingrediente</button>
        </div>
      </div>

      {/* cards superiores */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Package} tone="text-emerald-400" label="Itens em Estoque" value={cards.ok} />
        <StatCard icon={AlertTriangle} tone="text-amber-400" label="Itens Baixos" value={cards.baixo} />
        <StatCard icon={XCircle} tone="text-red-400" label="Itens Zerados" value={cards.zerado} />
        <StatCard icon={ShoppingBag} tone="text-sky-400" label="Compras Pendentes" value={0} hint="em breve" />
        <StatCard icon={Clock} tone="text-primary" label="Última Atualização" value={updatedAt ? new Date(updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"} small />
      </div>

      {/* central de avisos */}
      {notifications.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold"><Bell className="size-4 text-primary" /> Central de avisos</div>
          <div className="flex flex-wrap gap-2">
            {notifications.map((n) => (
              <span key={n.id} className={cn("rounded-full px-3 py-1 text-sm font-semibold", n.level === "zerado" ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400")}>{n.text}</span>
            ))}
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap gap-2.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, fornecedor ou categoria..." className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selCls}>
          <option value="todas">Todas categorias</option>
          {(Object.keys(CATEGORY_LABEL) as IngredientCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={selCls}>
          <option value="todos">Todos fornecedores</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* filtros rápidos */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        {([["todos", "Todos"], ["baixo", "Baixo estoque"], ["zerado", "Sem estoque"], ["consumidos", "Mais consumidos"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFlag(k)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", flag === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>{label}</button>
        ))}
        <span className="ml-auto self-center text-sm text-muted-foreground">{filtered.length} ingrediente(s)</span>
      </div>

      {/* tabela (desktop) / cards (mobile) */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">Nenhum ingrediente encontrado.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-secondary/50">
                  {["Ingrediente", "Categoria", "Qtd. Atual", "Unidade", "Mínimo", "Status", "Última Mov.", "Ações"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const st = stockStatus(i);
                  return (
                    <tr key={i.id} className="border-t border-border transition-colors hover:bg-secondary/50">
                      <td className="px-3 py-2.5"><div className="font-bold">{i.name}</div><div className="text-xs text-muted-foreground">{i.supplier || "—"}</div></td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{CATEGORY_LABEL[i.category]}</td>
                      <td className="px-3 py-2.5 font-display font-bold">{i.qty}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{UNIT_LABEL[i.unit]}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{i.minQty}</td>
                      <td className="px-3 py-2.5"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-[0.72rem] font-bold", STATUS_TONE[st])}>{STATUS_LABEL[st]}</span></td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{lastMovOf(i.id)}</td>
                      <td className="px-3 py-2.5"><Actions i={i} onView={() => setDetail(i)} onAdjust={() => setAdjust(i)} onEdit={() => setDrawer(i)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((i) => {
              const st = stockStatus(i);
              return (
                <div key={i.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate font-bold">{i.name}</div><div className="text-xs text-muted-foreground">{CATEGORY_LABEL[i.category]} · {i.supplier || "—"}</div></div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-bold", STATUS_TONE[st])}>{STATUS_LABEL[st]}</span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div><span className="font-display text-2xl font-bold">{i.qty}</span> <span className="text-sm text-muted-foreground">{UNIT_LABEL[i.unit]} · mín. {i.minQty}</span></div>
                    <Actions i={i} onView={() => setDetail(i)} onAdjust={() => setAdjust(i)} onEdit={() => setDrawer(i)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* gráficos placeholder */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {["Consumo Mensal", "Ingredientes Mais Utilizados", "Custo do Estoque", "Perdas"].map((t) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold"><BarChart3 className="size-4 text-primary" /> {t}</div>
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">Prévia — em breve</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Importação de ingredientes via CSV: estrutura preparada, disponível numa próxima fase.</p>

      <IngredientDrawer ingredient={drawer} onClose={() => setDrawer(null)} />
      <AdjustStockDrawer ingredient={adjust} onClose={() => setAdjust(null)} />
      <IngredientDetail ingredient={detail} onClose={() => setDetail(null)} />
      {recipes && <RecipesManager onClose={() => setRecipes(false)} />}
    </main>
  );
}

const selCls = "h-11 rounded-lg border border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

function StatCard({ icon: Icon, tone, label, value, hint, small }: { icon: typeof Package; tone: string; label: string; value: ReactNode; hint?: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone)} />
      </div>
      <div className={cn("mt-2 font-display font-bold", small ? "text-base" : "text-3xl")}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Actions({ i, onView, onAdjust, onEdit }: { i: Ingredient; onView: () => void; onAdjust: () => void; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn title="Ver" onClick={onView}><Eye className="size-4" /></IconBtn>
      <IconBtn title="Ajustar" onClick={onAdjust}><SlidersHorizontal className="size-4" /></IconBtn>
      <IconBtn title="Editar" onClick={onEdit}><Pencil className="size-4" /></IconBtn>
      <IconBtn title="Excluir" danger onClick={() => deleteIngredient(i.id)}><Trash2 className="size-4" /></IconBtn>
    </div>
  );
}
function IconBtn({ children, title, onClick, danger }: { children: ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={cn("flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors", danger ? "hover:border-red-400 hover:text-red-400" : "hover:border-primary hover:text-primary")}>{children}</button>;
}
