import { useState } from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Container } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { useScrolled } from "@/hooks";
import { siteConfig } from "@/services/site-config";
import { useShop } from "@/store/shop-context";
import { useSettings } from "@/hooks";

/**
 * Tema do header quando está no TOPO (transparente):
 * - "dark"  -> conteudo claro (sobre secoes escuras).
 * - "light" -> conteudo preto (sobre a Hero amarela).
 * Ao rolar, o header sempre fica solido escuro com conteudo claro.
 */
type TopTheme = "dark" | "light";

interface HeaderProps {
  topTheme?: TopTheme;
}

// Cor do texto/links no topo, conforme o tema (so quando NAO rolado).
const navLinkTop = cva("", {
  variants: {
    theme: {
      dark: "text-muted-foreground hover:text-foreground",
      light: "text-brand-ink/70 hover:text-brand-ink",
    },
  },
});

export function Header({ topTheme = "dark" }: HeaderProps) {
  const scrolled = useScrolled(8);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openCategories } = useShop();
  const { storeOpen } = useSettings();

  // Loja fechada: header entra no FLUXO (sticky) e sempre sólido, para a faixa
  // "LOJA FECHADA" ficar logo abaixo dele, sem sobreposição. Loja aberta:
  // comportamento aprovado (fixed, transparente no topo sobre a Hero).
  const solid = scrolled || !storeOpen;
  // No topo com tema claro e sólido desligado, o conteudo e preto (sobre amarelo).
  const onLightTop = !solid && topTheme === "light";

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-40 pt-safe transition-colors duration-section ease-brand",
        storeOpen ? "fixed" : "sticky",
        solid
          ? "border-b border-border bg-background/90 backdrop-blur-sm"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          {/* Esquerda: logo */}
          <Logo theme={onLightTop ? "ink" : "brand"} />

          {/* Centro: navegacao (desktop) */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Navegacao principal"
          >
            {siteConfig.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-hover ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  navLinkTop({ theme: onLightTop ? "light" : "dark" })
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Direita: CTA (desktop) + hamburguer (mobile) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCategories}
              className={cn(
                "hidden h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors duration-hover ease-brand active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline-flex",
                onLightTop
                  ? "bg-brand-ink text-primary hover:bg-black focus-visible:ring-brand-ink"
                  : "bg-primary text-primary-foreground hover:bg-brand-yellow-soft focus-visible:ring-ring"
              )}
            >
              Fazer Pedido
            </button>
            <MobileMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              triggerClassName={onLightTop ? "text-brand-ink" : "text-foreground"}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}
