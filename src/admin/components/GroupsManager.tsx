import { useState } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";

import { formatCurrency } from "@/utils/format";
import {
  type AddonGroup, type Addon,
  listAddons,
  createGroupAction, updateGroupAction, deleteGroupAction,
  createAddonAction, updateAddonAction, deleteAddonAction,
} from "@/services/catalog-store";

/** Grupos de adicionais reutilizáveis + seus itens (CRUD manual, persistente). */
export function GroupsManager({ groups, onClose }: { groups: AddonGroup[]; onClose: () => void }) {
  const [gname, setGname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addGroup() {
    if (busy || !gname.trim()) return;
    setError(null);
    setBusy(true);
    const r = await createGroupAction(gname.trim());
    setBusy(false);
    if (r.ok) setGname("");
    else setError(r.error ?? "Não foi possível criar o grupo.");
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Grupos de adicionais</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"><X className="size-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-1 flex gap-2">
            <input value={gname} onChange={(e) => setGname(e.target.value)} placeholder="Novo grupo (ex.: Molhos)" className="h-11 flex-1 rounded-lg border border-border bg-secondary px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
            <button type="button" onClick={addGroup} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-brand-yellow-soft disabled:opacity-60"><Plus className="size-4" /> Add</button>
          </div>
          {error && <p className="mb-3 mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex flex-col gap-4">
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);

  async function saveGroupField(patch: { name?: string; max?: number; required?: boolean }) {
    setError(null);
    const r = await updateGroupAction(group.id, patch);
    if (!r.ok) setError(r.error ?? "Não foi possível salvar o grupo.");
  }

  async function addAddon() {
    if (busy || !aname.trim()) return;
    setError(null);
    setBusy(true);
    const r = await createAddonAction(group.id, aname.trim(), Number(aprice.replace(",", ".")) || 0);
    setBusy(false);
    if (r.ok) { setAname(""); setAprice(""); }
    else setError(r.error ?? "Não foi possível salvar o adicional.");
  }

  async function removeGroup() {
    if (busy) return;
    setError(null);
    setBusy(true);
    const r = await deleteGroupAction(group.id);
    setBusy(false);
    if (r.ok) setAskDelete(false);
    else setError(r.error ?? "Não foi possível excluir o grupo.");
  }

  return (
    <div className="rounded-xl border border-border bg-secondary p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <input defaultValue={group.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== group.name && saveGroupField({ name: e.target.value.trim() })} className="min-w-0 flex-1 bg-transparent font-display font-bold focus:outline-none" />
        <button type="button" title="Excluir grupo" onClick={() => setAskDelete(true)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">Máx.
          <input type="number" defaultValue={group.max} onBlur={(e) => saveGroupField({ max: Number(e.target.value) })} className="w-14 rounded-md border border-border bg-card px-2 py-1 text-foreground focus-visible:outline-none" />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" defaultChecked={group.required} onChange={(e) => saveGroupField({ required: e.target.checked })} className="size-4 accent-primary" /> Obrigatório
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        {addons.map((a: Addon) => (
          <AddonRow key={a.id} addon={a} onError={setError} />
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <input value={aname} onChange={(e) => setAname(e.target.value)} placeholder="Adicional" className="h-9 min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <input value={aprice} onChange={(e) => setAprice(e.target.value)} placeholder="R$" inputMode="decimal" className="h-9 w-16 rounded-md border border-border bg-card px-2.5 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <button type="button" onClick={addAddon} disabled={busy} className="rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-brand-yellow-soft disabled:opacity-60">Add</button>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {askDelete && (
        <ConfirmModal
          title="Excluir grupo de adicionais?"
          text="Os vínculos deste grupo com os produtos serão removidos. Os produtos do cardápio não são alterados."
          confirmLabel="Excluir grupo"
          busy={busy}
          onCancel={() => setAskDelete(false)}
          onConfirm={removeGroup}
        />
      )}
    </div>
  );
}

/** Linha de um adicional: exibe / edita (nome, preço, disponível) / exclui. */
function AddonRow({ addon, onError }: { addon: Addon; onError: (m: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(addon.name);
  const [price, setPrice] = useState(String(addon.price).replace(".", ","));
  const [busy, setBusy] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  async function toggleAvailable() {
    onError(null);
    const r = await updateAddonAction(addon.id, { available: !addon.available });
    if (!r.ok) onError(r.error ?? "Não foi possível salvar.");
  }
  async function save() {
    if (busy || !name.trim()) return;
    onError(null);
    setBusy(true);
    const r = await updateAddonAction(addon.id, { name: name.trim(), price: Number(price.replace(",", ".")) || 0 });
    setBusy(false);
    if (r.ok) setEditing(false);
    else onError(r.error ?? "Não foi possível salvar.");
  }
  async function remove() {
    if (busy) return;
    onError(null);
    setBusy(true);
    const r = await deleteAddonAction(addon.id);
    setBusy(false);
    if (r.ok) setAskDelete(false);
    else onError(r.error ?? "Não foi possível excluir.");
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-3 py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-secondary px-2 py-1 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="R$" className="w-16 rounded-md border border-border bg-secondary px-2 py-1 text-sm focus-visible:border-primary focus-visible:outline-none" />
        <button type="button" title="Salvar" onClick={save} disabled={busy} className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-brand-yellow-soft disabled:opacity-60"><Check className="size-3.5" /></button>
        <button type="button" title="Cancelar" onClick={() => { setEditing(false); setName(addon.name); setPrice(String(addon.price).replace(".", ",")); }} disabled={busy} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{addon.name}</span>
      <span className="text-sm text-muted-foreground">{formatCurrency(addon.price)}</span>
      <button type="button" title={addon.available ? "Disponível" : "Indisponível"} onClick={toggleAvailable} className={"size-2.5 rounded-full " + (addon.available ? "bg-emerald-400" : "bg-neutral-600")} />
      <button type="button" title="Editar" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
      <button type="button" title="Excluir" onClick={() => setAskDelete(true)} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-3.5" /></button>

      {askDelete && (
        <ConfirmModal
          title="Excluir adicional?"
          text="Esse adicional será removido deste grupo."
          confirmLabel="Excluir"
          busy={busy}
          onCancel={() => setAskDelete(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

/** Modal simples de confirmação para ações destrutivas. */
function ConfirmModal({
  title, text, confirmLabel, busy, onCancel, onConfirm,
}: {
  title: string; text: string; confirmLabel: string; busy: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5" onClick={() => !busy && onCancel()}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-left" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-condensed text-2xl uppercase">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 flex-1 rounded-lg border border-border font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="h-11 flex-1 rounded-lg bg-red-500 font-extrabold text-white transition-colors hover:bg-red-600 active:scale-[0.99] disabled:opacity-60">{busy ? "Excluindo…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
