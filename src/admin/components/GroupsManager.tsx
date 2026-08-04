import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

import { formatCurrency } from "@/utils/format";
import {
  type AddonGroup, type Addon,
  createGroup, updateGroup, deleteGroup,
  createAddon, updateAddon, deleteAddon, listAddons,
} from "@/services/catalog-store";

/** Grupos de adicionais reutilizáveis + seus itens. */
export function GroupsManager({ groups, onClose }: { groups: AddonGroup[]; onClose: () => void }) {
  const [gname, setGname] = useState("");
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Grupos de adicionais</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex gap-2">
            <input value={gname} onChange={(e) => setGname(e.target.value)} placeholder="Novo grupo (ex.: Molhos)" className="h-11 flex-1 rounded-lg border border-border bg-secondary px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
            <button type="button" onClick={() => { if (gname.trim()) { createGroup(gname.trim()); setGname(""); } }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-brand-yellow-soft"><Plus className="size-4" /> Add</button>
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((g) => <GroupBlock key={g.id} group={g} />)}
          </div>
        </div>
      </aside>
    </>
  );
}

function GroupBlock({ group }: { group: AddonGroup }) {
  const addons = listAddons(group.id);
  const [aname, setAname] = useState("");
  const [aprice, setAprice] = useState("");
  return (
    <div className="rounded-xl border border-border bg-secondary p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <input defaultValue={group.name} onBlur={(e) => e.target.value.trim() && updateGroup(group.id, { name: e.target.value.trim() })} className="min-w-0 flex-1 bg-transparent font-display font-bold focus:outline-none" />
        <button type="button" title="Excluir grupo" onClick={() => deleteGroup(group.id)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">Máx.
          <input type="number" defaultValue={group.max} onBlur={(e) => updateGroup(group.id, { max: Number(e.target.value) })} className="w-14 rounded-md border border-border bg-card px-2 py-1 text-foreground focus-visible:outline-none" />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" defaultChecked={group.required} onChange={(e) => updateGroup(group.id, { required: e.target.checked })} className="size-4 accent-primary" /> Obrigatório
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        {addons.map((a: Addon) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{a.name}</span>
            <span className="text-sm text-muted-foreground">{formatCurrency(a.price)}</span>
            <button type="button" title={a.available ? "Disponível" : "Indisponível"} onClick={() => updateAddon(a.id, { available: !a.available })} className={"size-2.5 rounded-full " + (a.available ? "bg-emerald-400" : "bg-neutral-600")} />
            <button type="button" onClick={() => deleteAddon(a.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={aname} onChange={(e) => setAname(e.target.value)} placeholder="Adicional" className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <input value={aprice} onChange={(e) => setAprice(e.target.value)} placeholder="R$" inputMode="decimal" className="h-9 w-16 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <button type="button" onClick={() => { if (aname.trim()) { createAddon(group.id, aname.trim(), Number(aprice.replace(",", ".")) || 0); setAname(""); setAprice(""); } }} className="rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-brand-yellow-soft">Add</button>
      </div>
    </div>
  );
}
