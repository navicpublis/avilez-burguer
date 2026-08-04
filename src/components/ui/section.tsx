import * as React from "react";

import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Envolve o conteúdo em um Container. Padrão: true. */
  contained?: boolean;
  /** Espaçamento vertical. Padrão: "md". */
  spacing?: "sm" | "md" | "lg";
}

const spacingMap = {
  // Muito respiro entre seções (mobile first → cresce no desktop)
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-20 md:py-30",
} as const;

/**
 * Section — bloco de página com ritmo vertical consistente.
 * Padroniza o espaçamento entre seções e evita margens conflitantes.
 */
const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, contained = true, spacing = "md", children, ...props }, ref) => {
    const content = contained ? <Container>{children}</Container> : children;
    return (
      <section
        ref={ref}
        className={cn(spacingMap[spacing], className)}
        {...props}
      >
        {content}
      </section>
    );
  }
);
Section.displayName = "Section";

export { Section };
