import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

interface SectionHeadProps {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  /** Tema do fundo da secao (ajusta as cores do texto). */
  tone?: "dark" | "light";
}

/**
 * SectionHead — cabecalho padrao das secoes da landing.
 * Eyebrow + titulo forte (condensada/Anton) + descricao curta.
 */
export function SectionHead({ eyebrow, title, desc, tone = "dark" }: SectionHeadProps) {
  const light = tone === "light";
  return (
    <Reveal className="mb-10 max-w-2xl">
      <span
        className={cn(
          "mb-3.5 inline-block text-[0.8rem] font-bold uppercase tracking-[0.14em] opacity-70",
          light ? "text-brand-ink" : "text-foreground"
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          "font-condensed uppercase leading-[0.92] tracking-[0.01em]",
          light ? "text-brand-ink" : "text-foreground"
        )}
        style={{ fontSize: "clamp(2.5rem, 9vw, 4.5rem)" }}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-4 max-w-[34ch] text-[1.05rem] leading-relaxed",
          light ? "text-brand-ink/70" : "text-muted-foreground"
        )}
      >
        {desc}
      </p>
    </Reveal>
  );
}
