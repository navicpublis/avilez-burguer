import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui";
import { useShop } from "@/store/shop-context";

interface Cat {
  emoji: string;
  name: string;
  desc: string;
  target?: string;
  soon?: boolean;
}

const CATS: Cat[] = [
  { emoji: "🍔", name: "Hambúrgueres", desc: "Feitos na chapa, na hora", target: "hamburgueres" },
  { emoji: "🍟", name: "Combos", desc: "Mais por menos", target: "combos" },
  { emoji: "🥤", name: "Bebidas", desc: "Pra acompanhar", target: "bebidas" },
  { emoji: "🍰", name: "Sobremesas", desc: "Final feliz", target: "sobremesas" },
  { emoji: "👶", name: "Kids", desc: "Em breve", soon: true },
  { emoji: "❤️", name: "Favoritos", desc: "Em breve", soon: true },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = document.getElementById("header");
  const offset = (header?.offsetHeight ?? 0) + 8;
  const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

/**
 * CategoriesSheet — abre ao tocar em "Fazer Pedido".
 * ~85% da tela, busca no topo e lista de categorias; ao escolher,
 * fecha e faz scroll suave até a seção.
 */
export function CategoriesSheet() {
  const { categoriesOpen, closeCategories } = useShop();
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();
  const items = CATS.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
  );

  function choose(c: Cat) {
    if (c.soon || !c.target) return;
    closeCategories();
    // espera a animação de saída do sheet antes de rolar
    window.setTimeout(() => scrollToSection(c.target!), 260);
  }

  return (
    <Sheet open={categoriesOpen} onOpenChange={(o: boolean) => !o && closeCategories()}>
      <SheetContent side="bottom" className="h-[85dvh]">
        <SheetHeader>
          <SheetTitle>O que vai ser hoje?</SheetTitle>
        </SheetHeader>

        <div className="relative mx-6 mb-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.1rem] -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você está com vontade de comer hoje?"
            className="h-12 w-full rounded-lg border border-border bg-secondary pl-11 pr-4 text-[0.95rem] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </div>

        <SheetBody>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-display text-lg">Nada encontrado</p>
              <p className="text-sm text-muted-foreground">Tente outra palavra.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => choose(c)}
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-secondary px-4 py-3.5 text-left transition-[background-color,transform] duration-hover ease-brand hover:bg-accent active:scale-[0.99]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-background text-2xl leading-none">
                    {c.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display font-bold text-foreground">{c.name}</span>
                    <span className="block text-[0.82rem] text-muted-foreground">{c.desc}</span>
                  </span>
                  {c.soon ? (
                    <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-primary">
                      Em breve
                    </span>
                  ) : (
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
