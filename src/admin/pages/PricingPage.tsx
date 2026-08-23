import { useEffect, useMemo, useState } from "react";
import { Search, Settings2, X, Plus, Trash2, Calculator, TrendingUp, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useCatalog } from "@/hooks";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  type CostItem, type PricingSettings, type PricingUnitKind,
  type PricingProfile, type PricingResult, type PricingStatus,
  UNIT_KIND_LABEL, STATUS_LABEL, computePricing, costOfItem, classifyStatus, breakEven,
  sanitizeMoneyInput, moneyToNumber, numberToMoneyInput,
} from "@/services/pricing";
import {
  buildAnalysisInput, localAnalysis, aiAnalysis, aiEnabled,
} from "@/services/pricing-ai";
import {
  fetchPricingSettings, savePricingSettings,
  fetchPricingProfile, savePricingProfile,
  fetchAllPricingProfiles,
} from "@/services/pricing-db";

const DEFAULT_SETTINGS: PricingSettings = { defaultMinMargin: 20, defaultTargetMargin: 50 };

type FilterKind = "todos" | "saudavel" | "atencao" | "baixa" | "prejuizo" | "nao";
type SortKind = "margem_desc" | "margem_asc" | "lucro_desc" | "lucro_asc" | "custo_desc" | "custo_asc";

const STATUS_DOT: Record<PricingStatus, string> = {
  prejuizo: "bg-red-500", baixa: "bg-orange-500", atencao: "bg-yellow-400", saudavel: "bg-emerald-500",
};
const STATUS_TEXT: Record<PricingStatus, string> = {
  prejuizo: "text-red-400", baixa: "text-orange-400", atencao: "text-yellow-300", saudavel: "text-emerald-400",
};

interface Row {
  id: string; name: string; price: number; priced: boolean;
  result: PricingResult | null; status: PricingStatus | null;
}

export function PricingPage() {
  const catalog = useCatalog();
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState<Map<string, PricingProfile>>(new Map());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("todos");
  const [sort, setSort] = useState<SortKind>("margem_desc");
  const [editing, setEditing] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  function reload() { void fetchAllPricingProfiles().then(setProfiles); }
  useEffect(() => {
    void fetchPricingSettings().then((s) => { if (s) setSettings(s); });
    reload();
  }, []);

  const rows: Row[] = useMemo(() => {
    return catalog.products.map((prod) => {
      const prof = profiles.get(prod.id);
      if (!prof) return { id: prod.id, name: prod.name, price: prod.price, priced: false, result: null, status: null };
      const min = prof.minMargin ?? settings.defaultMinMargin;
      const target = prof.targetMargin ?? settings.defaultTargetMargin;
      const sale = prof.salePrice ?? prod.price;
      const result = computePricing(prof.items, sale, min, target);
      const status = classifyStatus(result, min, target);
      return { id: prod.id, name: prod.name, price: prod.price, priced: true, result, status };
    });
  }, [catalog.products, profiles, settings]);

  const stats = useMemo(() => {
    const priced = rows.filter((r) => r.priced && r.result && r.result.sale > 0 && r.result.cost > 0);
    const margins = priced.map((r) => r.result!.marginPct);
    const avg = margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
    return {
      pricedCount: rows.filter((r) => r.priced).length,
      avgMargin: avg,
      maxMargin: margins.length ? Math.max(...margins) : 0,
      minMargin: margins.length ? Math.min(...margins) : 0,
      lossCount: rows.filter((r) => r.status === "prejuizo").length,
      attentionCount: rows.filter((r) => r.status === "atencao" || r.status === "baixa").length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => !q || r.name.toLowerCase().includes(q));
    if (filter === "nao") list = list.filter((r) => !r.priced);
    else if (filter !== "todos") list = list.filter((r) => r.status === filter);
    const val = (r: Row, k: "margem" | "lucro" | "custo") =>
      !r.result ? -Infinity : k === "margem" ? r.result.marginPct : k === "lucro" ? r.result.profit : r.result.cost;
    const [k, dir] = sort.split("_") as ["margem" | "lucro" | "custo", "asc" | "desc"];
    return [...list].sort((a, b) => { const d = val(a, k) - val(b, k); return dir === "asc" ? d : -d; });
  }, [rows, query, filter, sort]);

  const editingProduct = editing ? catalog.products.find((p) => p.id === editing) ?? null : null;

  const FILTERS: { key: FilterKind; label: string }[] = [
    { key: "todos", label: "Todos" }, { key: "saudavel", label: "Saudável" },
    { key: "atencao", label: "Atenção" }, { key: "baixa", label: "Margem baixa" },
    { key: "prejuizo", label: "Prejuízo" }, { key: "nao", label: "Não precificados" },
  ];

  return (
    <div className="pb-24">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Precificação</h1>
          <p className="text-sm text-muted-foreground">Custos, lucro e margem por produto. Estes dados são privados.</p>
        </div>
        <button type="button" onClick={() => setShowSettings(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-primary">
          <Settings2 className="size-4" /> Margens padrão
        </button>
      </div>

      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Conecte o Supabase para salvar a precificação. Sem conexão, os cálculos funcionam mas não são gravados.
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Precificados" value={String(stats.pricedCount)} />
        <Stat label="Margem média" value={`${stats.avgMargin.toFixed(1)}%`} />
        <Stat label="Maior margem" value={`${stats.maxMargin.toFixed(1)}%`} tone="good" />
        <Stat label="Menor margem" value={`${stats.minMargin.toFixed(1)}%`} />
        <Stat label="No prejuízo" value={String(stats.lossCount)} tone={stats.lossCount ? "bad" : undefined} />
        <Stat label="Precisam de atenção" value={String(stats.attentionCount)} tone={stats.attentionCount ? "warn" : undefined} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produto..." className="h-11 w-full rounded-lg border border-border bg-secondary pl-9 pr-3 text-sm focus-visible:border-primary focus-visible:outline-none" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKind)} className="h-11 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus-visible:outline-none">
          <option value="margem_desc">Maior margem</option>
          <option value="margem_asc">Menor margem</option>
          <option value="lucro_desc">Maior lucro</option>
          <option value="lucro_asc">Menor lucro</option>
          <option value="custo_desc">Maior custo</option>
          <option value="custo_asc">Menor custo</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              filter === f.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Produto</th>
              <th className="px-3 py-2.5 text-right font-semibold">Custo</th>
              <th className="px-3 py-2.5 text-right font-semibold">Preço atual</th>
              <th className="px-3 py-2.5 text-right font-semibold">Lucro</th>
              <th className="px-3 py-2.5 text-right font-semibold">Margem</th>
              <th className="px-3 py-2.5 text-right font-semibold">Markup</th>
              <th className="px-3 py-2.5 text-right font-semibold">Recomendado</th>
              <th className="px-3 py-2.5 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} onClick={() => setEditing(r.id)} className="cursor-pointer border-t border-border hover:bg-secondary/50">
                <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                {r.priced && r.result ? (
                  <>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(r.result.cost)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(r.price)}</td>
                    <td className={cn("px-3 py-2.5 text-right", r.result.profit < 0 && "text-red-400")}>{formatCurrency(r.result.profit)}</td>
                    <td className="px-3 py-2.5 text-right">{r.result.marginPct.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-right">{r.result.markup > 0 ? `${r.result.markup.toFixed(2)}x` : "—"}</td>
                    <td className="px-3 py-2.5 text-right">{formatCurrency(r.result.recommended)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn("size-2 rounded-full", r.status && STATUS_DOT[r.status])} />
                        <span className={cn("text-xs font-bold", r.status && STATUS_TEXT[r.status])}>{r.status && STATUS_LABEL[r.status]}</span>
                      </span>
                    </td>
                  </>
                ) : (
                  <td colSpan={7} className="px-3 py-2.5 text-right text-muted-foreground">Não precificado</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        {visible.map((r) => (
          <button key={r.id} type="button" onClick={() => setEditing(r.id)} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/50">
            <div className="min-w-0">
              <div className="truncate font-semibold">{r.name}</div>
              {r.priced && r.result ? (
                <div className="text-xs text-muted-foreground">Custo {formatCurrency(r.result.cost)} · Margem {r.result.marginPct.toFixed(1)}%</div>
              ) : (
                <div className="text-xs text-muted-foreground">Não precificado</div>
              )}
            </div>
            {r.priced && r.status
              ? <span className="inline-flex shrink-0 items-center gap-1.5"><span className={cn("size-2 rounded-full", STATUS_DOT[r.status])} /><span className={cn("text-xs font-bold", STATUS_TEXT[r.status])}>{STATUS_LABEL[r.status]}</span></span>
              : <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Definir</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      )}

      {editingProduct && (
        <PricingEditor key={editingProduct.id} productId={editingProduct.id} productName={editingProduct.name}
          productPrice={editingProduct.price} settings={settings} onClose={() => setEditing(null)} onSaved={reload} />
      )}

      {showSettings && (
        <SettingsDrawer settings={settings} onClose={() => setShowSettings(false)} onSaved={(s) => { setSettings(s); setShowSettings(false); }} />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[0.7rem] uppercase text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-display text-xl font-bold",
        tone === "good" && "text-emerald-400", tone === "bad" && "text-red-400", tone === "warn" && "text-yellow-300")}>{value}</div>
    </div>
  );
}

function emptyItem(order: number): CostItem {
  return { id: `tmp_${Math.random().toString(36).slice(2)}`, label: "", unitKind: "unidade", purchaseQty: 1, purchasePrice: 0, usedQty: 1, unitLabel: "", order };
}

function PricingEditor({
  productId, productName, productPrice, settings, onClose, onSaved,
}: {
  productId: string; productName: string; productPrice: number;
  settings: PricingSettings; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CostItem[]>([]);
  const [sale, setSale] = useState<string>(String(productPrice).replace(".", ","));
  const [minMargin, setMinMargin] = useState<string>(String(settings.defaultMinMargin));
  const [targetMargin, setTargetMargin] = useState<string>(String(settings.defaultTargetMargin));
  const [notes, setNotes] = useState("");
  const [sim, setSim] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchPricingProfile(productId).then((prof) => {
      if (!alive) return;
      if (prof) {
        setItems(prof.items.length ? prof.items : [emptyItem(0)]);
        if (prof.salePrice != null) setSale(String(prof.salePrice).replace(".", ","));
        if (prof.minMargin != null) setMinMargin(String(prof.minMargin));
        if (prof.targetMargin != null) setTargetMargin(String(prof.targetMargin));
        setNotes(prof.notes);
      } else {
        setItems([emptyItem(0)]);
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [productId]);

  const num = (s: string) => Number(s.replace(",", ".")) || 0;
  const minM = num(minMargin);
  const targetM = num(targetMargin);
  const result = useMemo(() => computePricing(items, num(sale), minM, targetM), [items, sale, minM, targetM]);
  const equilibrio = useMemo(() => breakEven(items), [items]);

  const simActive = sim.trim() !== "";
  const simResult = useMemo(() => (simActive ? computePricing(items, num(sim), minM, targetM) : null), [simActive, sim, items, minM, targetM]);
  const simStatus = simResult ? classifyStatus(simResult, minM, targetM) : null;

  function patchItem(id: string, patch: Partial<CostItem>) { setItems((l) => l.map((it) => (it.id === id ? { ...it, ...patch } : it))); }
  function addItem() { setItems((l) => [...l, emptyItem(l.length)]); }
  function removeItem(id: string) { setItems((l) => l.filter((it) => it.id !== id)); }

  async function save() {
    if (saving) return;
    setError(null); setSaved(false);
    if (!isSupabaseConfigured) { setError("Conecte o Supabase para salvar."); return; }
    setSaving(true);
    const r = await savePricingProfile({
      productId, salePrice: num(sale) || null, minMargin: minM, targetMargin: targetM,
      notes: notes.trim(),
      items: items.filter((it) => it.label.trim() || it.usedQty > 0 || it.purchasePrice > 0),
    });
    setSaving(false);
    if (r.ok) { setSaved(true); onSaved(); setTimeout(() => onClose(), 600); }
    else setError(r.error ?? "Não foi possível salvar.");
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold">{productName}</h2>
            <p className="text-xs text-muted-foreground">Precificação do produto</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Calculator className="size-4 text-primary" /> Custos</div>
              <div className="flex flex-col gap-3">
                {items.map((it) => (
                  <div key={it.id} className="rounded-xl border border-border bg-secondary p-3">
                    <div className="mb-2 flex gap-2">
                      <input value={it.label} onChange={(e) => patchItem(it.id, { label: e.target.value })} placeholder="Item (ex.: Carne)" className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
                      <button type="button" title="Remover" onClick={() => removeItem(it.id)} className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted-foreground">Tipo
                        <select value={it.unitKind} onChange={(e) => patchItem(it.id, { unitKind: e.target.value as PricingUnitKind })} className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none">
                          {(Object.keys(UNIT_KIND_LABEL) as PricingUnitKind[]).map((k) => <option key={k} value={k}>{UNIT_KIND_LABEL[k]}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">Rótulo un. (g, ml, un)
                        <input value={it.unitLabel} onChange={(e) => patchItem(it.id, { unitLabel: e.target.value })} placeholder="g" className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none" />
                      </label>
                      <label className="text-xs text-muted-foreground">Qtd. compra
                        <MoneyInput value={it.purchaseQty} onChangeNumber={(n) => patchItem(it.id, { purchaseQty: n })} ariaLabel="Quantidade da compra" className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none" />
                      </label>
                      <label className="text-xs text-muted-foreground">Preço compra (R$)
                        <MoneyInput value={it.purchasePrice} onChangeNumber={(n) => patchItem(it.id, { purchasePrice: n })} ariaLabel="Preço da compra" className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none" />
                      </label>
                      <label className="text-xs text-muted-foreground">Qtd. usada
                        <MoneyInput value={it.usedQty} onChangeNumber={(n) => patchItem(it.id, { usedQty: n })} ariaLabel="Quantidade usada" className="mt-1 h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus-visible:border-primary focus-visible:outline-none" />
                      </label>
                      <div className="flex flex-col justify-end text-xs text-muted-foreground">
                        Custo do item
                        <span className="mt-1 flex h-9 items-center font-display font-bold text-foreground">{formatCurrency(costOfItem(it))}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-primary"><Plus className="size-4" /> Adicionar custo</button>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <label className="text-xs text-muted-foreground">Preço de venda (R$)
                  <input value={sale} onChange={(e) => setSale(sanitizeMoneyInput(e.target.value))} onBlur={() => setSale(numberToMoneyInput(moneyToNumber(sale)))} type="text" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
                </label>
                <label className="text-xs text-muted-foreground">Margem mín. (%)
                  <input value={minMargin} onChange={(e) => setMinMargin(sanitizeMoneyInput(e.target.value))} type="text" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
                </label>
                <label className="text-xs text-muted-foreground">Margem desejada (%)
                  <input value={targetMargin} onChange={(e) => setTargetMargin(sanitizeMoneyInput(e.target.value))} type="text" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
                </label>
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">O preço de venda aqui é só para cálculo — não altera o preço do cardápio.</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric label="Custo total" value={formatCurrency(result.cost)} />
                <Metric label="Lucro" value={formatCurrency(result.profit)} tone={result.profit < 0 ? "bad" : "good"} />
                <Metric label="Margem" value={`${result.marginPct.toFixed(1)}%`} tone={result.belowMin ? "bad" : "good"} />
                <Metric label="Markup" value={result.markup > 0 ? `${result.markup.toFixed(2)}x` : "—"} />
                <Metric label="Ponto de equilíbrio" value={formatCurrency(equilibrio)} />
                <Metric label="Preço mínimo (margem mín.)" value={formatCurrency(result.minPrice)} />
                <Metric label="Preço recomendado" value={formatCurrency(result.recommended)} icon />
              </div>

              {result.belowMin && (
                <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">A venda atual está abaixo da margem mínima.</p>
              )}

              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-bold"><TrendingUp className="size-4 text-primary" /> Simular preço</div>
                <input value={sim} onChange={(e) => setSim(sanitizeMoneyInput(e.target.value))} type="text" inputMode="decimal" placeholder="Digite um preço para simular..." className="h-10 w-full rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
                {simResult && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <SimCell label="Lucro" value={formatCurrency(simResult.profit)} tone={simResult.profit < 0 ? "bad" : "good"} />
                    <SimCell label="Margem" value={`${simResult.marginPct.toFixed(1)}%`} />
                    <SimCell label="Markup" value={simResult.markup > 0 ? `${simResult.markup.toFixed(2)}x` : "—"} />
                    <SimCell label="Situação" value={simStatus ? STATUS_LABEL[simStatus] : "—"} tone={simStatus === "prejuizo" ? "bad" : simStatus === "saudavel" ? "good" : undefined} />
                  </div>
                )}
                <p className="mt-2 text-[0.7rem] text-muted-foreground">Simulação — não salva nem altera o cardápio.</p>
              </div>

              <AnalysisPanel productName={productName} items={items} result={result} minMargin={minM} targetMargin={targetM} />

              <label className="mt-4 block text-xs text-muted-foreground">Observações
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full resize-none rounded-md border border-border bg-secondary px-2.5 py-2 text-sm focus-visible:border-primary focus-visible:outline-none" />
              </label>
            </>
          )}
        </div>

        <footer className="border-t border-border p-4">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          {saved && !error && <p className="mb-3 text-sm text-emerald-400">Salvo ✓</p>}
          <button type="button" onClick={save} disabled={saving || loading} className="h-12 w-full rounded-lg bg-primary font-extrabold text-primary-foreground transition-colors hover:bg-brand-yellow-soft disabled:opacity-60">
            {saving ? "Salvando…" : "Salvar precificação"}
          </button>
        </footer>
      </aside>
    </>
  );
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: "good" | "bad"; icon?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-secondary p-3", icon && "border-primary/40 bg-primary/5")}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon && <TrendingUp className="size-3.5 text-primary" />}{label}</div>
      <div className={cn("mt-0.5 font-display text-lg font-bold", tone === "bad" && "text-red-400", tone === "good" && "text-emerald-400")}>{value}</div>
    </div>
  );
}

function SimCell({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="text-[0.65rem] uppercase text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-bold", tone === "bad" && "text-red-400", tone === "good" && "text-emerald-400")}>{value}</div>
    </div>
  );
}

function SettingsDrawer({ settings, onClose, onSaved }: { settings: PricingSettings; onClose: () => void; onSaved: (s: PricingSettings) => void }) {
  const [min, setMin] = useState(String(settings.defaultMinMargin));
  const [target, setTarget] = useState(String(settings.defaultTargetMargin));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setError(null);
    const next: PricingSettings = { defaultMinMargin: Number(min.replace(",", ".")) || 0, defaultTargetMargin: Number(target.replace(",", ".")) || 0 };
    if (!isSupabaseConfigured) { onSaved(next); return; }
    setSaving(true);
    const r = await savePricingSettings(next);
    setSaving(false);
    if (r.ok) onSaved(next);
    else setError(r.error ?? "Não foi possível salvar.");
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" onClick={onClose}>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-display text-lg font-bold">Margens padrão</h3>
          <p className="mt-1 text-sm text-muted-foreground">Usadas quando o produto não define margem própria.</p>
          <label className="mt-4 block text-xs text-muted-foreground">Margem mínima (%)
            <input value={min} onChange={(e) => setMin(sanitizeMoneyInput(e.target.value))} type="text" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
          </label>
          <label className="mt-3 block text-xs text-muted-foreground">Margem desejada (%)
            <input value={target} onChange={(e) => setTarget(sanitizeMoneyInput(e.target.value))} type="text" inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-border bg-secondary px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="h-11 flex-1 rounded-lg border border-border font-bold text-muted-foreground hover:text-foreground disabled:opacity-60">Cancelar</button>
            <button type="button" onClick={save} disabled={saving} className="h-11 flex-1 rounded-lg bg-primary font-extrabold text-primary-foreground hover:bg-brand-yellow-soft disabled:opacity-60">{saving ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Painel de ANÁLISE (read-only). Sempre mostra a análise LOCAL (sem IA, sem
 * chave, instantânea). Se houver um endpoint server-side seguro configurado
 * (VITE_PRICING_AI_URL), habilita o botão "Analisar com IA", que envia só os
 * números já calculados e mostra a interpretação da IA. Nada aqui altera preços,
 * produtos, estoque, pedidos, margens ou banco.
 */
function AnalysisPanel({
  productName, items, result, minMargin, targetMargin,
}: {
  productName: string; items: CostItem[]; result: PricingResult; minMargin: number; targetMargin: number;
}) {
  const status = useMemo(() => classifyStatus(result, minMargin, targetMargin), [result, minMargin, targetMargin]);
  const input = useMemo(
    () => buildAnalysisInput(productName, items, result, status, minMargin, targetMargin),
    [productName, items, result, status, minMargin, targetMargin]
  );
  const local = useMemo(() => localAnalysis(input), [input]);
  const [aiLines, setAiLines] = useState<string[] | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState(false);

  async function runAi() {
    if (loadingAi) return;
    setAiError(false);
    setLoadingAi(true);
    const lines = await aiAnalysis(input);
    setLoadingAi(false);
    if (lines && lines.length) setAiLines(lines);
    else setAiError(true);
  }

  const shown = aiLines ?? local;

  return (
    <div className="mt-5 rounded-xl border border-border bg-secondary p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="size-4 text-primary" /> Análise</div>
        {aiEnabled() && (
          <button type="button" onClick={runAi} disabled={loadingAi} className="rounded-md border border-primary/40 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-60">
            {loadingAi ? "Analisando…" : aiLines ? "Analisar de novo" : "Analisar com IA"}
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {shown.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {aiError && <p className="mt-2 text-xs text-amber-300">Não foi possível usar a IA agora. Mostrando a análise do sistema.</p>}
      <p className="mt-2 text-[0.7rem] text-muted-foreground">
        {aiLines ? "Interpretação por IA sobre os números calculados pelo sistema." : "Análise do sistema (sem IA)."} Somente leitura — não altera preços nem o cardápio.
      </p>
    </div>
  );
}

/**
 * MoneyInput — input de dinheiro/decimal em padrão BR.
 *
 * Controla a DIGITAÇÃO como string (aceita "3,80" e "3.80", não apaga centavos,
 * máx. 2 casas), converte para número só ao propagar (onChange) e ao sair do
 * campo (onBlur) formata como "3,80". Se o pai mudar o valor por fora (ex.:
 * carregar perfil), o texto reflete. Não usa type="number" (evita o locale do
 * navegador que causava o bug). Não altera nenhum cálculo — só a camada de UI.
 */
function MoneyInput({
  value, onChangeNumber, className, placeholder, ariaLabel,
}: {
  value: number;
  onChangeNumber: (n: number) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [text, setText] = useState<string>(() => numberToMoneyInput(value));
  const [focused, setFocused] = useState(false);

  // quando o valor do pai muda e o campo NÃO está em edição, reflete no texto
  useEffect(() => {
    if (!focused) setText(numberToMoneyInput(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const clean = sanitizeMoneyInput(e.target.value);
        setText(clean);                    // mostra exatamente o que a pessoa digita
        onChangeNumber(moneyToNumber(clean)); // propaga o número (nunca NaN)
      }}
      onBlur={() => {
        setFocused(false);
        setText(numberToMoneyInput(moneyToNumber(text))); // formata "3,80" ao sair
      }}
      className={className}
    />
  );
}
