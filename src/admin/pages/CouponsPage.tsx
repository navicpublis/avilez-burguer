import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import {
  listCoupons,
  updateCoupon,
  deleteCoupon,
  couponUsage,
  subscribe,
  type Coupon,
} from "@/services/coupons-store";
import { CouponDrawer } from "../components/CouponDrawer";

/** Gestão de cupons — cadastrados aqui são os únicos válidos no checkout. */
export function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(listCoupons);
  useEffect(() => subscribe(() => setCoupons(listCoupons())), []);

  const [drawer, setDrawer] = useState<Coupon | "new" | null>(null);

  function discountLabel(c: Coupon): string {
    return c.type === "pct" ? `${c.value}%` : formatCurrency(c.value);
  }

  return (
    <main className="w-full max-w-[1100px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Cupons</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Só cupons ativos e válidos concedem desconto no checkout.</p>
        </div>
        <button type="button" onClick={() => setDrawer("new")} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.98]">
          <Plus className="size-4" /> Novo cupom
        </button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhum cupom cadastrado. Enquanto não houver cupons, qualquer código é recusado no checkout.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {coupons.map((c) => {
            const used = couponUsage(c.code);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-extrabold tracking-wide">{c.code}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider", c.active ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground")}>{c.active ? "Ativo" : "Pausado"}</span>
                    </div>
                    {c.description && <div className="mt-0.5 text-sm text-muted-foreground">{c.description}</div>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Desconto: <span className="text-foreground">{discountLabel(c)}</span></span>
                      {c.minOrder > 0 && <span>Mínimo: <span className="text-foreground">{formatCurrency(c.minOrder)}</span></span>}
                      <span>Usos: <span className="text-foreground">{used}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</span></span>
                      {c.expiresAt && <span>Até: <span className="text-foreground">{new Date(c.expiresAt).toLocaleDateString("pt-BR")}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateCoupon(c.id, { active: !c.active })} aria-label={c.active ? "Pausar" : "Reativar"} className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
                      {c.active ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <button type="button" onClick={() => setDrawer(c)} aria-label="Editar" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary"><Pencil className="size-4" /></button>
                    <button type="button" onClick={() => { if (confirm(`Excluir o cupom ${c.code}?`)) deleteCoupon(c.id); }} aria-label="Excluir" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-400"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CouponDrawer open={drawer !== null} coupon={drawer && drawer !== "new" ? drawer : null} onClose={() => setDrawer(null)} />
    </main>
  );
}
