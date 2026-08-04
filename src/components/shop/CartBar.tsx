import { useEffect } from "react";
import { ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useShop } from "@/store/shop-context";

/**
 * CartBar — barra fixa no rodapé, aparece quando há ≥1 item.
 * Nunca cobre o conteúdo: adiciona espaço no fim do body via CSS var.
 * Animação discreta (slide up 250ms).
 */
export function CartBar() {
  const { count, total, openCart } = useShop();
  const show = count > 0;

  // reserva espaço no fim da página para a barra não cobrir conteúdo
  useEffect(() => {
    document.body.style.setProperty("--cart-bar-space", show ? "5.5rem" : "0px");
    return () => document.body.style.setProperty("--cart-bar-space", "0px");
  }, [show]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-0 transition-transform duration-[250ms] ease-brand",
        show ? "translate-y-0" : "pointer-events-none translate-y-[120%]"
      )}
    >
      <button
        type="button"
        onClick={openCart}
        aria-label="Abrir carrinho"
        className="mx-auto flex w-full max-w-2xl items-center gap-3.5 rounded-lg bg-primary py-2.5 pl-[1.1rem] pr-2.5 text-primary-foreground shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]"
      >
        <span className="relative inline-flex">
          <ShoppingCart className="size-6" strokeWidth={2} />
          <span className="absolute -right-2 -top-1.5 inline-flex h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full bg-background px-1 text-[0.7rem] font-extrabold text-primary">
            {count}
          </span>
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block text-[0.8rem] font-semibold opacity-85">
            {count} {count === 1 ? "item" : "itens"}
          </span>
          <span className="block font-display text-[1.05rem] font-extrabold">
            {formatCurrency(total)}
          </span>
        </span>
        <span className="shrink-0 rounded-md bg-background px-4 py-2.5 text-[0.9rem] font-extrabold text-primary">
          Continuar
        </span>
      </button>
    </div>
  );
}
