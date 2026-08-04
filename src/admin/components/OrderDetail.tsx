import { X, MapPin, Phone, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { WHATSAPP_NUMBER } from "@/services/orders";
import { updateStatus, type ManagedOrder } from "@/services/orders-store";
import { ALL_STATUSES, STATUS_META } from "@/services/order-status";
import { StatusBadge } from "@/components/order/StatusBadge";
import { OrderTimeline } from "@/components/order/OrderTimeline";

/** Botões de mudança rápida de status (um clique). */
function StatusButtons({ order }: { order: ManagedOrder }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_STATUSES.map((s) => {
        const meta = STATUS_META[s];
        const active = order.status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => updateStatus(order.id, s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors",
              active ? "border-transparent " + meta.badge : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/** Painel lateral com os detalhes completos do pedido. */
export function OrderDetail({ order, onClose }: { order: ManagedOrder; onClose: () => void }) {
  const c = order.customer;
  const created = new Date(order.createdAt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">#{order.id}</div>
            <div className="text-xs text-muted-foreground">{created}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <StatusBadge status={order.status} />

          {/* mudança de status */}
          <div className="mt-4">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Alterar status</div>
            <StatusButtons order={order} />
          </div>

          {/* cliente */}
          <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
            <div className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Cliente</div>
            <div className="mt-1 font-bold">{c.name}</div>
            <a href={`tel:${c.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Phone className="size-3.5" /> {c.phone}
            </a>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {c.street}, {c.number}
                {c.complement ? ` — ${c.complement}` : ""}<br />
                {c.neighborhood}
                {c.reference ? <><br />Ref.: {c.reference}</> : null}
              </span>
            </div>
          </div>

          {/* mapa (estrutura) */}
          <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><MapPin className="size-4" /> Mapa — em breve</span>
          </div>

          {/* itens */}
          <div className="mt-6">
            <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Itens</div>
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-2 border-b border-border py-2.5 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{it.qty}× {it.name}</div>
                  {it.addons.length > 0 && <div className="text-xs text-muted-foreground">+ {it.addons.join(", ")}</div>}
                  {it.obs && <div className="text-xs italic text-muted-foreground">“{it.obs}”</div>}
                </div>
                <div className="shrink-0 font-display text-sm font-bold">{formatCurrency(it.lineTotal)}</div>
              </div>
            ))}
          </div>

          {/* pagamento / totais */}
          <div className="mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>{formatCurrency(order.fee)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto</span><span>− {formatCurrency(order.discount)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-border pt-2 font-display text-lg font-extrabold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            <div className="mt-1 text-muted-foreground">Pagamento: <span className="text-foreground">{order.payment}{order.changeFor ? ` (troco p/ ${order.changeFor})` : ""}</span></div>
          </div>

          {/* timeline */}
          <div className="mt-6">
            <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Linha do tempo</div>
            <OrderTimeline status={order.status} history={order.history} />
          </div>

          <a href={waHref} target="_blank" rel="noreferrer" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg border border-border font-bold hover:bg-secondary">
            <MessageCircle className="size-4" /> Falar com o cliente
          </a>
        </div>
      </aside>
    </>
  );
}
