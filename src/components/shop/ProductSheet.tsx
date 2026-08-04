import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { findProduct, ADDONS, OBS_SUGGESTIONS } from "@/services/menu-data";
import { useShop } from "@/store/shop-context";
import { QtyStepper } from "./QtyStepper";

/**
 * ProductSheet — abre ao tocar num card de produto.
 * Foto, descrição, ingredientes, adicionais (somam ao preço),
 * quantidade, observações e "Adicionar ao carrinho" com total dinâmico.
 */
export function ProductSheet() {
  const { productId, closeProduct, add, openCart } = useShop();
  const product = productId ? findProduct(productId) : undefined;

  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState<string[]>([]);
  const [obs, setObs] = useState("");

  // reseta o estado a cada produto aberto
  useEffect(() => {
    setQty(1);
    setAddons([]);
    setObs("");
  }, [productId]);

  if (!product) return null;

  const addonSum = addons.reduce((s, id) => {
    const a = ADDONS.find((x) => x.id === id);
    return s + (a ? a.price : 0);
  }, 0);
  const unit = product.price + addonSum;
  const total = unit * qty;

  function toggleAddon(id: string) {
    setAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function appendObs(text: string) {
    setObs((prev) => (prev.trim() ? prev.replace(/\s*$/, "") + ", " + text : text));
  }
  function handleAdd() {
    add(product!.id, qty, addons, obs);
    closeProduct();
    openCart();
  }

  return (
    <Sheet open={!!productId} onOpenChange={(o: boolean) => !o && closeProduct()}>
      <SheetContent side="bottom" className="max-h-[92dvh]">
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">{product.name}</SheetTitle>
        </SheetHeader>

        <SheetBody className="pt-0">
          {/* Foto grande (sangra nas laterais) */}
          <div className="-mx-6 mb-4 aspect-[16/10] overflow-hidden bg-primary">
            {product.image ? (
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[radial-gradient(120%_120%_at_50%_0%,#1d1d1d_0%,#131313_100%)]">
                <span className="font-condensed text-5xl text-primary/90">A.</span>
                <span className="text-sm text-muted-foreground">Foto em breve</span>
              </div>
            )}
          </div>

          <h3 className="font-display text-2xl font-bold leading-tight">{product.name}</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{product.desc}</p>
          <p className="mt-3 font-display text-2xl font-extrabold text-primary">
            {formatCurrency(product.price)}
          </p>

          {/* Ingredientes */}
          <div className="mt-6">
            <div className="mb-2.5 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
              Ingredientes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.ingredients.map((i) => (
                <span
                  key={i}
                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-neutral-300"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          {/* Adicionais */}
          {product.hasAddons && (
            <div className="mt-6">
              <div className="mb-2.5 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
                Adicionais
              </div>
              {ADDONS.map((a) => {
                const on = addons.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAddon(a.id)}
                    className={cn(
                      "mb-2 flex w-full items-center justify-between gap-3 rounded-md border bg-secondary px-3.5 py-3 transition-colors duration-hover ease-brand hover:bg-accent",
                      on ? "border-primary" : "border-border"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-[1.35rem] items-center justify-center rounded-[0.4rem] border-2 transition-colors",
                          on ? "border-primary bg-primary" : "border-border"
                        )}
                      >
                        <Check
                          className={cn(
                            "size-[0.85rem] text-primary-foreground",
                            on ? "opacity-100" : "opacity-0"
                          )}
                          strokeWidth={3}
                        />
                      </span>
                      <span className="text-[0.92rem] font-semibold">{a.name}</span>
                    </span>
                    <span className="shrink-0 text-[0.85rem] font-bold text-muted-foreground">
                      + {formatCurrency(a.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Observações */}
          <div className="mt-6">
            <div className="mb-2.5 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
              Observações
            </div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {OBS_SUGGESTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => appendObs(o)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-hover ease-brand hover:border-primary hover:text-foreground"
                >
                  {o}
                </button>
              ))}
            </div>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: sem cebola, caprichar no molho..."
              className="min-h-[4.5rem] w-full resize-y rounded-md border border-border bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
            />
          </div>

          {/* Quantidade */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
              Quantidade
            </span>
            <QtyStepper value={qty} onChange={setQty} />
          </div>
        </SheetBody>

        <SheetFooter>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-14 w-full items-center justify-between gap-4 rounded-lg bg-primary px-5 font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99]"
          >
            <span>Adicionar ao carrinho</span>
            <span className="font-display">{formatCurrency(total)}</span>
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
