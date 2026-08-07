import { useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, Store, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks";
import {
  updateBusiness,
  updateAdmin,
  updateLanding,
  toggleSection,
  setHours,
  setStoreOpen,
  type HoursRow,
  type SectionKey,
} from "@/services/settings-store";
import {
  listNeighborhoods,
  createNeighborhood,
  updateNeighborhood,
  deleteNeighborhood,
  subscribe as subNeighborhoods,
  type Neighborhood,
} from "@/services/neighborhoods-store";

type Tab = "geral" | "landing" | "horarios" | "bairros" | "loja" | "perfil";
const TABS: { key: Tab; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "landing", label: "Landing Page" },
  { key: "horarios", label: "Horários" },
  { key: "bairros", label: "Bairros e Entregas" },
  { key: "loja", label: "Loja" },
  { key: "perfil", label: "Perfil" },
];

const field = "h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none";
const lbl = "mb-1.5 block text-[0.8rem] font-semibold text-foreground";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const s = useSettings();
  const [tab, setTab] = useState<Tab>("geral");

  return (
    <main className="w-full max-w-[1100px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Configurações</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Central de controle do site e da operação.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", tab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>{t.label}</button>
        ))}
      </div>

      {tab === "geral" && (
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <Row label="Nome da hamburgueria"><input className={field} value={s.business.name} onChange={(e) => updateBusiness({ name: e.target.value })} /></Row>
          <Row label="WhatsApp (só números)"><input className={field} value={s.business.whatsapp} onChange={(e) => updateBusiness({ whatsapp: e.target.value })} /></Row>
          <Row label="WhatsApp (exibição)"><input className={field} value={s.business.whatsappDisplay} onChange={(e) => updateBusiness({ whatsappDisplay: e.target.value })} /></Row>
          <Row label="Instagram"><input className={field} value={s.business.instagram} onChange={(e) => updateBusiness({ instagram: e.target.value })} /></Row>
          <Row label="Facebook"><input className={field} value={s.business.facebook} onChange={(e) => updateBusiness({ facebook: e.target.value })} /></Row>
          <Row label="Cidade"><input className={field} value={s.business.city} onChange={(e) => updateBusiness({ city: e.target.value })} /></Row>
          <Row label="Estado"><input className={field} value={s.business.state} onChange={(e) => updateBusiness({ state: e.target.value })} /></Row>
          <div className="sm:col-span-2">
            <Row label="Descrição curta"><textarea className={cn(field, "h-20 resize-none py-2.5")} value={s.business.description} onChange={(e) => updateBusiness({ description: e.target.value })} /></Row>
          </div>
        </div>
      )}

      {tab === "landing" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5">
            <Row label="Título do Hero"><input className={field} value={s.landing.heroTitle} onChange={(e) => updateLanding({ heroTitle: e.target.value })} /></Row>
            <Row label="Título do CTA final"><input className={field} value={s.landing.ctaTitle} onChange={(e) => updateLanding({ ctaTitle: e.target.value })} /></Row>
            <Row label="Informações de entrega"><input className={field} value={s.landing.deliveryInfo} onChange={(e) => updateLanding({ deliveryInfo: e.target.value })} /></Row>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Seções visíveis</h3>
            <div className="flex flex-col gap-2">
              {([["hamburgueres", "Cardápio"], ["avaliacoes", "Avaliações"], ["entrega", "Área de entrega"], ["localizacao", "Localização"], ["pedir", "Chamada final"]] as [SectionKey, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-md border border-border bg-secondary px-4 py-2.5">
                  <span className="text-sm font-semibold">{label}</span>
                  <button type="button" onClick={() => toggleSection(key, !s.landing.sectionsVisible[key])} className={cn("relative h-6 w-11 rounded-full transition-colors", s.landing.sectionsVisible[key] ? "bg-primary" : "bg-neutral-700")}>
                    <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", s.landing.sectionsVisible[key] ? "translate-x-[1.4rem]" : "translate-x-0.5")} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "horarios" && <HoursEditor hours={s.hours} />}

      {tab === "bairros" && <NeighborhoodsEditor />}

      {tab === "loja" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className={cn("flex size-16 items-center justify-center rounded-full", s.storeOpen ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
              <Store className="size-8" />
            </span>
            <div>
              <div className="font-display text-2xl font-extrabold">{s.storeOpen ? "LOJA ABERTA" : "LOJA FECHADA"}</div>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {s.storeOpen ? "Os clientes podem fazer pedidos normalmente." : "Novos pedidos estão bloqueados no site. O cardápio segue visível para consulta."}
              </p>
            </div>
            <button type="button" onClick={() => setStoreOpen(!s.storeOpen)} className={cn("h-12 rounded-lg px-8 font-bold transition-colors active:scale-[0.99]", s.storeOpen ? "bg-red-500 text-white hover:bg-red-600" : "bg-emerald-500 text-white hover:bg-emerald-600")}>
              {s.storeOpen ? "Fechar loja" : "Abrir loja"}
            </button>
          </div>
        </div>
      )}

      {tab === "perfil" && (
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <Row label="Nome exibido"><input className={field} value={s.admin.displayName} onChange={(e) => updateAdmin({ displayName: e.target.value })} /></Row>
          <Row label="E-mail exibido"><input className={field} value={s.admin.email} onChange={(e) => updateAdmin({ email: e.target.value })} /></Row>
          <Row label="Cargo"><input className={field} value={s.admin.role} disabled /></Row>
          <div className="sm:col-span-2">
            <label className={lbl}>Foto de perfil</label>
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-primary font-display font-bold text-primary-foreground">
                {s.admin.photo ? <img src={s.admin.photo} alt="Perfil" className="size-full object-cover" /> : "AB"}
              </span>
              <label className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
                Enviar foto
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => updateAdmin({ photo: String(r.result) });
                  r.readAsDataURL(f);
                }} />
              </label>
              {s.admin.photo && <button type="button" onClick={() => updateAdmin({ photo: null })} className="text-sm text-muted-foreground hover:text-red-400">Remover</button>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HoursEditor({ hours }: { hours: HoursRow[] }) {
  const [rows, setRows] = useState<HoursRow[]>(hours);
  const [saved, setSaved] = useState(false);

  function set(i: number, patch: Partial<HoursRow>) {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function add() {
    setRows((r) => [...r, { id: `h${Date.now().toString(36)}`, days: "", time: "" }]);
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, j) => j !== i));
  }
  function save() {
    setHours(rows.map((r) => ({ ...r, time: r.time && r.time.trim() ? r.time : null })));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input className={field} value={r.days} onChange={(e) => set(i, { days: e.target.value })} placeholder="Ex.: Segunda a Quinta" />
            <input className={field} value={r.time ?? ""} onChange={(e) => set(i, { time: e.target.value })} placeholder="Ex.: 18h às 23h (vazio = A definir)" />
            <button type="button" onClick={() => remove(i)} aria-label="Remover" className="flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-red-500 hover:text-red-400"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={add} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-secondary"><Plus className="size-4" /> Adicionar horário</button>
        <button type="button" onClick={save} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-brand-yellow-soft active:scale-[0.98]">
          {saved ? <><Check className="size-4" /> Salvo</> : "Salvar horários"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Estes horários alimentam a Landing e o rodapé.</p>
    </div>
  );
}

function NeighborhoodsEditor() {
  const [list, setList] = useState<Neighborhood[]>(listNeighborhoods);
  useEffect(() => subNeighborhoods(() => setList(listNeighborhoods())), []);

  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [avg, setAvg] = useState("");

  function add() {
    if (!name.trim()) return;
    createNeighborhood({ name: name.trim(), fee: Number(fee.replace(",", ".")) || 0, avgTime: avg.trim() || "30 a 40 min", active: true });
    setName(""); setFee(""); setAvg("");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-4 text-xs text-muted-foreground">Fonte única: alimenta o select do checkout, o cálculo da taxa, a Landing e os relatórios.</p>

      <div className="mb-5 grid grid-cols-[1fr_6rem_1fr_auto] gap-2">
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bairro" />
        <input className={field} value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" placeholder="Taxa" />
        <input className={field} value={avg} onChange={(e) => setAvg(e.target.value)} placeholder="Tempo (ex.: 30 a 40 min)" />
        <button type="button" onClick={add} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-brand-yellow-soft active:scale-[0.98]"><Plus className="size-4" /></button>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum bairro cadastrado.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-2.5">
              <input className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold focus-visible:border-border focus-visible:outline-none" value={n.name} onChange={(e) => updateNeighborhood(n.id, { name: e.target.value })} />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">R$<input className="h-9 w-16 rounded-md border border-transparent bg-transparent px-1 text-sm text-foreground focus-visible:border-border focus-visible:outline-none" value={String(n.fee)} onChange={(e) => updateNeighborhood(n.id, { fee: Number(e.target.value.replace(",", ".")) || 0 })} /></div>
              <input className="h-9 w-28 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted-foreground focus-visible:border-border focus-visible:outline-none" value={n.avgTime} onChange={(e) => updateNeighborhood(n.id, { avgTime: e.target.value })} />
              <button type="button" onClick={() => updateNeighborhood(n.id, { active: !n.active })} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider", n.active ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground")}>{n.active ? "Ativo" : "Inativo"}</button>
              <button type="button" onClick={() => { if (confirm(`Excluir o bairro "${n.name}"?`)) deleteNeighborhood(n.id); }} aria-label="Excluir" className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
