import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — rótulo compacto (ex.: "Mais pedido", "Novo").
 * Pequeno, discreto e legível. Usar com parcimônia.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none transition-colors duration-hover ease-brand [&_svg]:size-3",
  {
    variants: {
      variant: {
        // Destaque de marca
        default: "bg-primary text-primary-foreground",
        // Neutro sobre superfície escura
        neutral: "bg-secondary text-secondary-foreground",
        // Somente contorno
        outline: "border border-border text-foreground",
        // Marca em contorno (mais discreto que o sólido)
        brand: "border border-primary/40 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
