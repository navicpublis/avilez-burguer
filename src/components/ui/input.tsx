import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — campo de texto de linha única.
 * Altura confortável para toque, borda discreta, foco em amarelo.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-lg border border-input bg-secondary px-4 py-2 text-base text-foreground",
          "placeholder:text-muted-foreground",
          "transition-colors duration-hover ease-brand",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
