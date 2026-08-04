import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  Button,
} from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { siteConfig } from "@/services/site-config";
import { useShop } from "@/store/shop-context";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Classe extra do botao hamburguer (cor conforme o tema do header). */
  triggerClassName?: string;
}

/**
 * Menu de navegacao para mobile.
 * Botao hamburguer abre um painel lateral (Sheet) com os links e a acao
 * primaria "Fazer Pedido". Visivel apenas abaixo de md.
 *
 * O CTA abre o cardapio.
 */
export function MobileMenu({
  open,
  onOpenChange,
  triggerClassName,
}: MobileMenuProps) {
  const { openCategories } = useShop();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("md:hidden", triggerClassName)}
          aria-label="Abrir menu"
        >
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="p-0">
        <div className="flex h-full flex-col pt-safe">
          <div className="p-6">
            <Logo />
          </div>

          <nav className="flex flex-col px-4" aria-label="Navegacao principal">
            {siteConfig.nav.map((item) => (
              <SheetClose asChild key={item.href}>
                <a
                  href={item.href}
                  className="rounded-lg px-4 py-3.5 font-display text-lg font-semibold text-foreground transition-colors duration-hover ease-brand hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              </SheetClose>
            ))}
          </nav>

          <div className="mt-auto p-6 pb-safe">
            <SheetClose asChild>
              <Button size="lg" className="w-full" onClick={openCategories}>
                🍔 Fazer Pedido
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
