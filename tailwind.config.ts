import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Design tokens da Avilez Burguer.
 * Paleta: preto (predominante) + amarelo (acento de marca) + branco.
 * Cinza somente para detalhes. Sem laranja, sem gradientes exagerados.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Container centralizado com respiro generoso (mobile first)
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem", // 20px — respiro confortável no mobile
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1200px", // largura máxima de leitura confortável
      },
    },
    extend: {
      colors: {
        // Tokens semânticos (mapeados para CSS vars em globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Paleta de marca (valores fixos, para uso direto quando necessário)
        brand: {
          black: "#111111",
          ink: "#0B0B0B", // preto mais profundo (fundos)
          surface: "#171717", // superfície elevada sobre o preto
          yellow: "#FFC107", // amarelo de marca (acento)
          "yellow-soft": "#FFD34E", // amarelo mais claro p/ hover sutil
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Manrope"', "system-ui", "sans-serif"],
        // Fonte condensada/agressiva do título da Hero
        condensed: ['"Anton"', '"Space Grotesk"', "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala tipográfica com line-heights confortáveis
        "display-lg": ["clamp(2.75rem, 9vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2.25rem, 7vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-sm": ["clamp(1.75rem, 5vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
      },
      borderRadius: {
        // Arredondamento moderno: nem quadrado, nem pílula
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        // Sombras muito discretas
        subtle: "0 1px 2px rgba(0, 0, 0, 0.24)",
        soft: "0 8px 24px -12px rgba(0, 0, 0, 0.45)",
        lift: "0 16px 40px -16px rgba(0, 0, 0, 0.55)",
        // Realce de marca (usar com muita parcimônia)
        glow: "0 8px 32px -12px rgba(255, 193, 7, 0.35)",
      },
      spacing: {
        // Respiro extra além da escala padrão do Tailwind
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      transitionTimingFunction: {
        // Easing suave padrão da marca
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        // Durações padrão (motion tokens)
        hover: "150ms",
        press: "100ms",
        card: "250ms",
        section: "350ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "sheet-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "overlay-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.96)" },
        },
      },
      animation: {
        "fade-in": "fade-in 350ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-up": "fade-up 350ms cubic-bezier(0.22, 1, 0.36, 1)",
        "sheet-up": "sheet-up 350ms cubic-bezier(0.22, 1, 0.36, 1)",
        "sheet-down": "sheet-down 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        "overlay-in": "overlay-in 250ms ease-out",
        "overlay-out": "overlay-out 200ms ease-in",
        "scale-in": "scale-in 250ms cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-out": "scale-out 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
