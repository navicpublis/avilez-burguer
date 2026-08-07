import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { createCoupon, updateCoupon, type Coupon } from "@/services/coupons-store";

/** Drawer de criação/edição de cupom (salva localmente). */
export function CouponDrawer({
  open,
  coupon,
  onClose,
  onSaved,
}: {
  open: boolean;
  coupon?: Coupon | null;
  onClose: () => void;
  onSaved?: (code: string) => void;
}) {
  const editing = coupon ?? null;
  const [code, setCode] = useState(editing?.code ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [type, setType] = useState<"pct" | "fixed">(editing?.type ?? "pct");
  const [value, setValue] = useState(editing ? String(editing.value) : "");
  const [minOrder, setMinOrder] = useState(editing?.minOrder ? String(editing.minOrder) : "");
  const [validFrom, setValidFrom] = useState(editing?.validFrom ?? "");
  const [expiresAt, setExpiresAt] = useState(editing?.expiresAt ?? "");
  const [usageLimit, setUsageLimit] = useState(editing?.usageLimit ? String(editing.usageLimit) : "");
  const [perCustomer, setPerCustomer] = useState(editing?.perCustomerLimit ? String(editing.perCustomerLimit) : "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function save() {
    const v = Number(value.replace(",", "."));
    if (!code.trim()) return setError("Informe o código do cupom.");
    if (!v || v <= 0) return setError("Informe um valor válido.");
    const data = {
      code: code.trim(),
      description: description.trim(),
      type,
      value: v,
      minOrder: Number(minOrder.replace(",", ".")) || 0,
      validFrom: validFrom || null,
      expiresAt: expiresAt || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      perCustomerLimit: perCustomer ? Number(perCustomer) : null,
      active,
    };
    if (editing) updateCoupon(editing.id, data);
    else createCoupon(data);
    onSaved?.(data.code.toUpperCase());
    onClose();
  }

  const field = "h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none";
  const lbl = "mb-1.5 block text-[0.8rem] font-semibold text-foreground";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-lg font-bold">{editing ? "Editar cupom" : "Novo cupom"}</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Código</label>
              <input className={cn(field, "uppercase")} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código do cupom" />
            </div>
            <div>
              <label className={lbl}>Descrição</label>
              <input className={field} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: 10% na primeira compra" />
            </div>

            <div>
              <label className={lbl}>Tipo de desconto</label>
              <div className="grid grid-cols-2 gap-2">
                {(["pct", "fixed"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={cn("h-11 rounded-md border text-sm font-bold transition-colors", type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                    {t === "pct" ? "Porcentagem (%)" : "Valor fixo (R$)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{type === "pct" ? "Desconto (%)" : "Desconto (R$)"}</label>
                <input className={field} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={type === "pct" ? "10" : "5,00"} />
              </div>
              <div>
                <label className={lbl}>Pedido mínimo (R$)</label>
                <input className={field} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} inputMode="decimal" placeholder="0,00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Válido a partir de</label>
                <input type="date" className={field} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Válido até</label>
                <input type="date" className={field} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Limite total de usos</label>
                <input className={field} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} inputMode="numeric" placeholder="Ilimitado" />
              </div>
              <div>
                <label className={lbl}>Limite por cliente</label>
                <input className={field} value={perCustomer} onChange={(e) => setPerCustomer(e.target.value)} inputMode="numeric" placeholder="Ilimitado" />
              </div>
            </div>

            <button type="button" onClick={() => setActive((a) => !a)} className="flex items-center justify-between rounded-md border border-border bg-secondary px-4 py-3">
              <span className="text-sm font-semibold">Cupom ativo</span>
              <span className={cn("relative h-6 w-11 rounded-full transition-colors", active ? "bg-primary" : "bg-neutral-700")}>
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", active ? "translate-x-[1.4rem]" : "translate-x-0.5")} />
              </span>
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button type="button" onClick={save} className="h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.99]">
            {editing ? "Salvar alterações" : "Salvar cupom"}
          </button>
        </div>
      </aside>
    </>
  );
}
