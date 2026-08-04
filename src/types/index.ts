/**
 * Tipos base do projeto. Cresce conforme novas fases (produtos,
 * pedidos, etc.) forem adicionadas — por ora, o essencial da fundação.
 */

/** Item de navegação (usado no header e no menu mobile). */
export interface NavItem {
  label: string;
  href: string;
}

/** Link de rede social exibido no rodapé. */
export interface SocialLink {
  label: string;
  href: string;
  /** Nome do ícone lucide-react correspondente. */
  icon: "instagram" | "facebook" | "whatsapp";
}
