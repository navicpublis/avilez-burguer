import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface AppLayoutProps {
  children: ReactNode;
  /**
   * Tema do header no topo (transparente):
   * "light" quando a pagina abre sobre a Hero amarela; "dark" caso contrario.
   */
  headerTopTheme?: "dark" | "light";
}

/**
 * AppLayout - estrutura base de toda pagina.
 * Header fixo + area de conteudo + Footer. Inclui um "pular para o
 * conteudo" para acessibilidade de teclado.
 */
export function AppLayout({ children, headerTopTheme = "dark" }: AppLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteudo
      </a>

      <Header topTheme={headerTopTheme} />

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
