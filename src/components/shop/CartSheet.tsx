import { useState } from "react";
import { ShoppingCart } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks";
import { formatCurrency } from "@/utils/format";
import { findProduct, findAddon } from "@/services/menu-data";
import { useShop } from "@/store/shop-context";
import { QtyStepper } from "./QtyStepper";

/**
 * CartSheet — bottom sheet do carrinho.
 * Lista itens (qtd, preço unitário, adicionais, observações), cupom,
 * subtotal, taxa de entrega e total. Estado vazio incluído.
 * "Finalizar Pedido" abre o checkout.
 */
export function CartSheet() {
  const {
    cart,
    cartOpen,
    closeCart,
    setQty,
    remove,
    unitPrice,
    subtotal,
    fee,
    feeReady,
    discount,
    total,
    coupon,
    applyCoupon,
    openCategories,
    openCheckout,
  } = useShop();
  const { storeOpen } = useSettings();

  const [code, setCode] = useState(coupon ?? "");
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleCoupon() {
    if (!code.trim()) return;
    const ok = applyCoupon(code);
    setNotice(
      ok
        ? { ok: true, msg: "Cupom aplicado com sucesso." }
        : { ok: false, msg: "Cupom incorreto ou indisponível." }
    );
    window.setTimeout(() => setNotice(null), 3000);
  }

  const empty = cart.length === 0;

  return (
    <Sheet open={cartOpen} onOpenChange={(o: boolean) => !o && closeCart()}>
      <SheetContent side="bottom" className="max-h-[90dvh]">
        <SheetHeader>
          <SheetTitle>Seu pedido</SheetTitle>
        </SheetHeader>

        <SheetBody>
          {empty ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
                <ShoppingCart className="size-7 text-muted-foreground" strokeWidth={1.8} />
              </span>
              <h4 className="font-display text-lg">Seu carrinho está vazio</h4>
              <p className="max-w-[24ch] text-sm text-muted-foreground">
                Escolha um hambúrguer e comece seu pedido.
              </p>
            </div>
          ) : (
            <>
              {cart.map((item, idx) => {
                const p = findProduct(item.id);
                if (!p) return null;
                const adds = item.addons
                  .map((a) => findAddon(a)?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div
                    key={idx}
                    className="flex animate-fade-up gap-3.5 border-b border-border py-4 last:border-0"
                  >
                    <div className="size-14 shrink-0 overflow-hidden rounded-md bg-primary">
                      {p.image ? (
                        <img src={p.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-900 font-condensed text-xl text-primary/90">
                          A.
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-[0.95rem] font-bold">{p.name}</div>
                      <div className="mt-0.5 text-[0.78rem] text-muted-foreground">
                        {formatCurrency(unitPrice(item))} cada
                      </div>
                      {adds && (
                        <div className="mt-0.5 text-[0.78rem] text-muted-foreground">+ {adds}</div>
                      )}
                      {item.obs && (
                        <div className="mt-0.5 text-[0.78rem] italic text-muted-foreground">
                          “{item.obs}”
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <QtyStepper
                          size="sm"
                          value={item.qty}
                          onChange={(q) => setQty(idx, q)}
                          min={0}
                        />
                        <span className="font-display font-extrabold">
                          {formatCurrency(unitPrice(item) * item.qty)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="mt-1 text-[0.78rem] text-muted-foreground underline transition-colors hover:text-red-400"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Cupom */}
              <div className="mt-4 flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Cupom de desconto"
                  className="h-11 flex-1 rounded-md border border-border bg-secondary px-3.5 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCoupon}
                  disabled={!code.trim()}
                  className="h-11 shrink-0 rounded-md border border-border bg-secondary px-4 text-[0.85rem] font-bold text-foreground transition-colors hover:bg-accent active:scale-[0.98] disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
              {notice && (
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    notice.ok ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {notice.msg}
                </p>
              )}

              {/* Totais */}
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[0.92rem] text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[0.92rem] text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>
                    {feeReady ? (fee > 0 ? formatCurrency(fee) : "Grátis") : "A calcular"}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between text-[0.92rem] text-emerald-400">
                    <span>Desconto ({coupon})</span>
                    <span>− {formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-display text-xl font-extrabold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </>
          )}
        </SheetBody>

        <SheetFooter>
          {empty ? (
            <button
              type="button"
              onClick={() => {
                closeCart();
                openCategories();
              }}
              className="h-14 w-full rounded-lg bg-primary font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99]"
            >
              Ver cardápio
            </button>
          ) : (
            <div className="grid grid-cols-[1fr_1.3fr] gap-2.5">
              <button
                type="button"
                onClick={closeCart}
                className="h-[3.25rem] rounded-lg border-[1.5px] border-border font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={storeOpen ? openCheckout : undefined}
                disabled={!storeOpen}
                className="h-[3.25rem] rounded-lg bg-primary font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                {storeOpen ? "Finalizar Pedido" : "Loja fechada"}
              </button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
