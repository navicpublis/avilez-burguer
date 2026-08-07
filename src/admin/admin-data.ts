import {
  LayoutGrid, Receipt, Beef, Tags, Package, Users, Star, Ticket,
  BarChart3, Settings, StickyNote, type LucideIcon,
} from "lucide-react";

/** Item de navegação da sidebar. */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "pedidos", label: "Pedidos", icon: Receipt },
  { key: "produtos", label: "Produtos", icon: Beef },
  { key: "categorias", label: "Categorias", icon: Tags },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "avaliacoes", label: "Avaliações", icon: Star },
  { key: "cupons", label: "Cupons", icon: Ticket },
  { key: "relatorios", label: "Relatórios", icon: BarChart3 },
  { key: "anotacoes", label: "Anotações", icon: StickyNote },
  { key: "configuracoes", label: "Configurações", icon: Settings },
];
