import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Atraso da animacao em ms (para escalonar itens de um grid). */
  delay?: number;
}

/**
 * Reveal — anima o conteudo com fade + translateY(20px) ao entrar na tela,
 * uma unica vez. Duracao ~420ms. Respeita prefers-reduced-motion.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const { ref, shown } = useReveal();
  return (
    <div
      ref={ref}
      className={cn(
        "min-w-0 transition-[opacity,transform] duration-[420ms] ease-brand motion-reduce:transition-none",
        shown ? "opacity-100 translate-y-0" : "translate-y-5 opacity-0",
        className
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
