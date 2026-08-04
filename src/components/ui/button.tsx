import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — ação da interface.
 * Peso 600, cantos arredondados modernos, transições curtas.
 * Alvo de toque confortável (>= 48px de altura nos tamanhos padrão).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-sans font-semibold transition-colors duration-hover ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Ação primária: amarelo de marca sobre preto
        primary:
          "bg-primary text-primary-foreground hover:bg-brand-yellow-soft shadow-subtle",
        // Ação secundária: superfície escura
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-accent",
        // Contorno discreto
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent",
        // Sem preenchimento
        ghost: "bg-transparent text-foreground hover:bg-accent",
        // Link textual
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-6 text-[0.95rem]",
        lg: "h-14 px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza o filho como o elemento raiz (ex.: <a>) mantendo o estilo. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
