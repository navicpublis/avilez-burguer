import {
  LayoutGrid, Receipt, Beef, Tags, Package, Users, Star, Ticket,
  BarChart3, Settings, ShoppingBag, DollarSign, Flame, CheckCircle2,
  Clock, XCircle, type LucideIcon,
} from "lucide-react";

/** Item de navegação da sidebar. `soon` = tela de fase futura. */
export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "pedidos", label: "Pedidos", icon: Receipt },
  { key: "produtos", label: "Produtos", icon: Beef },
  { key: "categorias", label: "Categorias", icon: Tags, soon: true },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "clientes", label: "Clientes", icon: Users, soon: true },
  { key: "avaliacoes", label: "Avaliações", icon: Star, soon: true },
  { key: "cupons", label: "Cupons", icon: Ticket, soon: true },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, soon: true },
  { key: "configuracoes", label: "Configurações", icon: Settings, soon: true },
];

export type Trend = "up" | "flat";
export interface Stat {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  icon: LucideIcon;
}

export const STATS: Stat[] = [
  { label: "Pedidos hoje", value: "47", delta: "+12%", trend: "up", icon: ShoppingBag },
  { label: "Faturamento hoje", value: "R$ 2.847,90", delta: "+8%", trend: "up", icon: DollarSign },
  { label: "Em produção", value: "6", delta: "agora", trend: "flat", icon: Flame },
  { label: "Entregues hoje", value: "39", delta: "+15%", trend: "up", icon: CheckCircle2 },
  { label: "Ticket médio", value: "R$ 60,59", delta: "+3%", trend: "up", icon: Receipt },
  { label: "Tempo médio", value: "38 min", delta: "-4%", trend: "up", icon: Clock },
];

export const WEEK: { day: string; value: number }[] = [
  { day: "Seg", value: 32 }, { day: "Ter", value: 41 }, { day: "Qua", value: 38 },
  { day: "Qui", value: 52 }, { day: "Sex", value: 74 }, { day: "Sáb", value: 89 }, { day: "Dom", value: 61 },
];

export const REVENUE = [1200, 1650, 1480, 2100, 3200, 4100, 2848];

export const TOP: { name: string; value: number }[] = [
  { name: "Avilez Clássico", value: 132 }, { name: "Duplo Cheddar", value: 108 },
  { name: "Bacon Supremo", value: 87 }, { name: "Combo Clássico", value: 64 }, { name: "Salada da Casa", value: 51 },
];

export type OrderStatus = "novo" | "producao" | "entrega" | "entregue" | "cancelado";
export interface AdminOrder {
  id: string; customer: string; value: string; status: OrderStatus; statusLabel: string; time: string;
}

export const RECENT_ORDERS: AdminOrder[] = [
  { id: "AVLZ-48392", customer: "Renan Souza", value: "R$ 79,80", status: "novo", statusLabel: "Novo", time: "20:14" },
  { id: "AVLZ-51203", customer: "Marina Alves", value: "R$ 45,90", status: "producao", statusLabel: "Em produção", time: "20:08" },
  { id: "AVLZ-49881", customer: "Carlos Nunes", value: "R$ 122,40", status: "entrega", statusLabel: "Saiu p/ entrega", time: "19:52" },
  { id: "AVLZ-49102", customer: "Beatriz Lima", value: "R$ 38,90", status: "entregue", statusLabel: "Entregue", time: "19:40" },
  { id: "AVLZ-48765", customer: "Paulo Vidal", value: "R$ 64,80", status: "entregue", statusLabel: "Entregue", time: "19:31" },
  { id: "AVLZ-48540", customer: "Aline Costa", value: "R$ 51,90", status: "cancelado", statusLabel: "Cancelado", time: "19:20" },
];

export interface AdminNotif {
  icon: LucideIcon; title: string; sub: string; time: string; tone: "yellow" | "blue" | "red";
}

export const NOTIFS: AdminNotif[] = [
  { icon: ShoppingBag, title: "Novo pedido", sub: "#AVLZ-48392 · R$ 79,80", time: "agora", tone: "yellow" },
  { icon: Package, title: "Produto sem estoque", sub: "Cerveja Long Neck", time: "12 min", tone: "blue" },
  { icon: Star, title: "Nova avaliação", sub: "5★ de Beatriz Lima", time: "28 min", tone: "yellow" },
  { icon: XCircle, title: "Pedido cancelado", sub: "#AVLZ-48540", time: "40 min", tone: "red" },
];

export const QUICK_ACTIONS = ["Novo Produto", "Novo Cupom", "Novo Pedido Manual", "Atualizar Estoque"];

export const STATUS_CLASSES: Record<OrderStatus, string> = {
  novo: "text-primary bg-primary/10",
  producao: "text-sky-400 bg-sky-400/10",
  entrega: "text-violet-400 bg-violet-400/10",
  entregue: "text-emerald-400 bg-emerald-400/10",
  cancelado: "text-red-400 bg-red-400/10",
};
