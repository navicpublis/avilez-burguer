import { Plus, Ticket, Receipt, Package } from "lucide-react";

/** Atalhos de ações rápidas da Dashboard (todos funcionais). */
export function QuickActions({
  onNewProduct,
  onNewOrder,
  onAdjustStock,
  onNewCoupon,
}: {
  onNewProduct: () => void;
  onNewOrder: () => void;
  onAdjustStock: () => void;
  onNewCoupon: () => void;
}) {
  const actions = [
    { label: "Novo Produto", icon: Plus, onClick: onNewProduct },
    { label: "Novo Pedido Manual", icon: Receipt, onClick: onNewOrder },
    { label: "Atualizar Estoque", icon: Package, onClick: onAdjustStock },
    { label: "Novo Cupom", icon: Ticket, onClick: onNewCoupon },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold transition-[border-color,background-color] hover:border-primary hover:bg-secondary active:scale-[0.98]"
        >
          <Icon className="size-[1.05rem] text-primary" />
          {label}
        </button>
      ))}
    </div>
  );
}
