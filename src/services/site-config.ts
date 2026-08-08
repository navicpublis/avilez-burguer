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
  /** Descrição institucional (rodapé). */
  description:
    "Hambúrgueres feitos na chapa, preparados na hora com ingredientes selecionados.",

  /** Localização da operação. A loja física ainda não existe (só delivery). */
  location: {
    city: "Mangaratiba - RJ",
  },

  /**
   * Horários de funcionamento. Domingo fica preparado para configuração
   * futura (time: null → exibido como "A definir").
   */
  hours: [
    { days: "Segunda a Quinta", time: "18h às 23h" },
    { days: "Sexta a Domingo", time: "18h às 00h" },
    { days: "Domingo", time: null },
  ] as const,

  contact: {
    /** Número no formato E.164 (sem símbolos) para links wa.me. */
    whatsapp: "5521971902603",
    whatsappDisplay: "(21) 97190-2603",
    instagramHandle: "@avilezburguer",
    facebookName: "Avilez Burguer",
  },

  /**
   * Navegação principal. Âncoras internas com scroll suave:
   * Início → Hero, Cardápio → seção do cardápio, Localização → seção nova,
   * Contato → rodapé.
   */
  nav: [
    { label: "Início", href: "#inicio" },
    { label: "Cardápio", href: "#hamburgueres" },
    { label: "Localização", href: "#localizacao" },
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
