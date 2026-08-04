import { cn } from "@/lib/utils";
import logoBlack from "@/assets/logo-black.png";
import logoWhite from "@/assets/logo-white.png";

interface LogoProps {
  className?: string;
  /** Tamanho do logo. Padrao: "md". */
  size?: "sm" | "md";
  /**
   * Esquema de cor da logo oficial (mesma arte, so a cor muda):
   * - "ink":  logo PRETA  (para fundos claros, ex. Hero amarela).
   * - "brand": logo BRANCA (para fundos escuros: header rolado, footer, menu). Padrao.
   */
  theme?: "brand" | "ink";
}

// Proporcao original preservada (280x189). Altura fixa, largura automatica.
const sizeMap = {
  sm: "h-8",
  md: "h-10 md:h-[3.25rem]",
} as const;

/**
 * Logo - logo OFICIAL da Avilez Burguer (imagem, nao texto).
 * Usa o arquivo enviado pelo cliente; nunca distorce (mantem proporcao),
 * sem fundo, sem sombra/filtro. Duas versoes de cor: preta e branca.
 */
export function Logo({ className, size = "md", theme = "brand" }: LogoProps) {
  const src = theme === "ink" ? logoBlack : logoWhite;
  return (
    <a
      href="#inicio"
      aria-label="Avilez Burguer - inicio"
      className={cn(
        "inline-flex items-center transition-opacity duration-hover ease-brand hover:opacity-85",
        "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <img
        src={src}
        alt="Avilez Burguer"
        width={280}
        height={189}
        className={cn("w-auto", sizeMap[size])}
      />
    </a>
  );
}
