import * as React from "react";

import { cn } from "@/lib/utils";

type HeadingElement = "h1" | "h2" | "h3" | "h4";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Nível visual (controla o tamanho). Padrão: 2. */
  level?: 1 | 2 | 3 | 4;
  /** Tag HTML renderizada — separa semântica de aparência. Padrão: segue o level. */
  as?: HeadingElement;
}

const sizeByLevel = {
  1: "text-display-md",
  2: "text-display-sm",
  3: "text-2xl md:text-3xl leading-tight tracking-tight",
  4: "text-xl md:text-2xl leading-snug tracking-tight",
} as const;

/**
 * Heading — título com a display face (Space Grotesk) e a escala da marca.
 * `level` define o tamanho; `as` define a tag, para manter a ordem
 * semântica dos headings independente do tamanho visual.
 */
const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 2, as, children, ...props }, ref) => {
    const Tag = (as ?? (`h${level}` as HeadingElement)) as HeadingElement;
    return (
      <Tag
        ref={ref}
        className={cn(
          "font-display font-bold text-foreground",
          sizeByLevel[level],
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Heading.displayName = "Heading";

export { Heading };
