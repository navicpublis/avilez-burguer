import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container — centraliza o conteúdo e aplica o gutter responsivo.
 * Usa o `container` configurado no Tailwind (max 1200px, padding mobile first).
 */
const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("container", className)} {...props} />
));
Container.displayName = "Container";

export { Container };
