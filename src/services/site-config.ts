import type { NavItem, SocialLink } from "@/types";

/**
 * Configuração central do site.
 * Ponto único de verdade para dados de marca e contato — no futuro,
 * parte disto virá de um painel admin, mas o formato permanece.
 */
export const siteConfig = {
  name: "Avilez Burguer",
  /** Texto curto de apoio (tagline institucional). */
  tagline: "Hambúrgueres feitos na chapa.",

  contact: {
    /** Número no formato E.164 (sem símbolos) para links wa.me. */
    whatsapp: "5521971902603",
    whatsappDisplay: "(21) 97190-2603",
  },

  /** Navegação principal. Âncoras internas — as seções chegam nas próximas fases. */
  nav: [
    { label: "Início", href: "#inicio" },
    { label: "Cardápio", href: "#cardapio" },
    { label: "Sobre", href: "#sobre" },
    { label: "Contato", href: "#contato" },
  ] satisfies NavItem[],

  social: [
    {
      label: "Instagram",
      href: "https://instagram.com/avilezburguer",
      icon: "instagram",
    },
    {
      label: "Facebook",
      href: "https://facebook.com/avilezburguer",
      icon: "facebook",
    },
  ] satisfies SocialLink[],
} as const;

/** Monta o link de conversa do WhatsApp, com mensagem opcional. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${siteConfig.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
