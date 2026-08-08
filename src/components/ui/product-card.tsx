import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import type { Product } from "@/services/menu-data";

interface ProductCardProps {
  product: Product;
  /** Variante compacta (bebidas). */
  small?: boolean;
  /** Abre o bottom sheet do produto. Sem isto o card é apenas visual. */
  onSelect?: (id: string) => void;
}

/**
 * ProductCard — card compacto e reutilizavel.
 * Imagem grande no topo (ou placeholder "foto em breve"), nome, descricao
 * truncada em 2 linhas, preco e botao "Adicionar".
 * O card inteiro e o botao abrem o bottom sheet do produto.
 * Produto indisponivel: overlay "Indisponivel", nao clicavel.
 */
export function ProductCard({ product, small = false, onSelect }: ProductCardProps) {
  const { id, name, desc, price, image, oldPrice, badge, available } = product;
  const clickable = available && !!onSelect;

  const open = () => {
    if (clickable) onSelect!(id);
  };

  return (
    <article
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Ver ${name}` : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground",
        "shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)] transition-[transform,box-shadow] duration-card ease-brand",
        clickable && "cursor-pointer",
        !available && "cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.99] hover:[@media(hover:hover)]:scale-[1.02] hover:[@media(hover:hover)]:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
      )}
    >
      {/* Midia */}
      <div
        className={cn(
          "relative overflow-hidden bg-primary",
          small ? "aspect-[4/3]" : "aspect-square"
        )}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            width={520}
            height={520}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[radial-gradient(120%_120%_at_50%_0%,#1d1d1d_0%,#131313_100%)]"
          >
            <span className="font-condensed text-4xl leading-none text-primary/90">A.</span>
            <span className="text-xs tracking-wide text-muted-foreground">Foto em breve</span>
          </div>
        )}
        {badge && available && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand-ink px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-primary">
            {badge}
          </span>
        )}
        {!available && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60 font-display text-[0.9rem] font-bold tracking-wide text-white backdrop-blur-[1px]">
            Indisponível
          </span>
        )}
      </div>

      {/* Corpo */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3.5 pb-4 pt-3">
        <h3
          className={cn(
            "font-display font-bold leading-tight text-foreground",
            small ? "text-[0.92rem]" : "text-base"
          )}
        >
          {name}
        </h3>
        <p className="line-clamp-2 text-[0.82rem] leading-snug text-muted-foreground">{desc}</p>
        <div className="mt-auto flex flex-col gap-2 pt-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-2">
          <div className="flex shrink-0 flex-col leading-none">
            {oldPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(oldPrice)}
              </span>
            )}
            <strong className="whitespace-nowrap text-[1.02rem] font-extrabold text-foreground">
              {formatCurrency(price)}
            </strong>
          </div>
          <button
            type="button"
            disabled={!available}
            aria-label={`Adicionar ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="w-full shrink-0 whitespace-nowrap rounded-md bg-primary px-3.5 py-2 text-[0.82rem] font-bold text-primary-foreground transition-colors duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 min-[400px]:w-auto"
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
