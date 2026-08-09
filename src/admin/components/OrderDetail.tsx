import { useState } from "react";
import { X, MapPin, Phone, MessageCircle, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { WHATSAPP_NUMBER, type CustomerData } from "@/services/orders";
import {
  updateStatus,
  setStatusRemote,
  updateOrderCustomer,
  type ManagedOrder,
} from "@/services/orders-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ALL_STATUSES, STATUS_META } from "@/services/order-status";
import { StatusBadge } from "@/components/order/StatusBadge";
import { OrderTimeline } from "@/components/order/OrderTimeline";

/** Botões de mudança rápida de status (um clique, sem sair da tela). */
function StatusButtons({ order }: { order: ManagedOrder }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function change(status: (typeof ALL_STATUSES)[number]) {
    if (busy || order.status === status) return;
    setError(null);
    if (!isSupabaseConfigured) { updateStatus(order.id, status); return; }
    setBusy(true);
    const r = await setStatusRemote(order.id, status);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Não foi possível atualizar o pedido.");
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
      {ALL_STATUSES.map((s) => {
        const meta = STATUS_META[s];
        const active = order.status === s;
        return (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => change(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-colors active:scale-[0.98]",
              active
                ? "border-transparent " + meta.badge
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            <span>{meta.emoji}</span>
            {meta.label}
          </button>
        );
      })}
      </div>
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{error}</p>
      )}
    </div>
  );
}

/** Painel lateral com os detalhes completos do pedido. */
export function OrderDetail({
  order,
  onClose,
  startEditing = false,
}: {
  order: ManagedOrder;
  onClose: () => void;
  startEditing?: boolean;
}) {
  const c = order.customer;
  const [editing, setEditing] = useState(startEditing);
  const [form, setForm] = useState<CustomerData>(c);

  const created = new Date(order.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;
  const setF = (k: keyof CustomerData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function saveEdit() {
    updateOrderCustomer(order.id, form);
    setEditing(false);
  }

  const inputCls =
    "h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-lg font-bold">#{order.id}</div>
            <div className="text-xs text-muted-foreground">{created}</div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Editar"
                className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"
              >
                <Pencil className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <StatusBadge status={order.status} />

          {order.status === "cancelado" && order.cancelReason && (
            <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              Cancelado — {order.cancelReason}
            </p>
          )}

          {/* mudança de status */}
          {order.status !== "cancelado" && (
            <div className="mt-4">
              <div className="mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">
                Alterar status
              </div>
              <StatusButtons order={order} />
            </div>
          )}

          {/* cliente — visualização ou edição */}
          <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">
                Cliente
              </div>
              {editing && (
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-primary">Editando</span>
              )}
            </div>

            {!editing ? (
              <>
                <div className="font-bold">{c.name}</div>
                <a href={`tel:${c.phone}`} className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Phone className="size-3.5" /> {c.phone}
                </a>
                <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {c.street}, {c.number}
                    {c.complement ? ` — ${c.complement}` : ""}
                    <br />
                    {c.neighborhood}
                    {c.reference ? (
                      <>
                        <br />
                        Ref.: {c.reference}
                      </>
                    ) : null}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <input className={inputCls} value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Nome" />
                <input className={inputCls} value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="Telefone" />
                <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                  <input className={inputCls} value={form.street} onChange={(e) => setF("street", e.target.value)} placeholder="Rua" />
                  <input className={inputCls} value={form.number} onChange={(e) => setF("number", e.target.value)} placeholder="Nº" />
                </div>
                <input className={inputCls} value={form.complement} onChange={(e) => setF("complement", e.target.value)} placeholder="Complemento" />
                <input className={inputCls} value={form.neighborhood} onChange={(e) => setF("neighborhood", e.target.value)} placeholder="Bairro" />
                <input className={inputCls} value={form.reference} onChange={(e) => setF("reference", e.target.value)} placeholder="Referência" />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(c);
                      setEditing(false);
                    }}
                    className="h-10 flex-1 rounded-md border border-border text-sm font-semibold text-muted-foreground hover:bg-accent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="h-10 flex-1 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.99]"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
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

          {/* observações do pedido */}
          {order.notes && order.notes.trim() && (
            <div className="mt-4 rounded-lg border border-border bg-secondary p-3">
              <div className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Observações</div>
              <p className="mt-1 text-sm text-foreground">{order.notes}</p>
            </div>
          )}

          {/* pagamento / totais */}
          <div className="mt-4 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Taxa de entrega</span><span>{order.fee > 0 ? formatCurrency(order.fee) : "Grátis"}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto{order.coupon ? ` (${order.coupon})` : ""}</span><span>− {formatCurrency(order.discount)}</span></div>}
            <div className="mt-1 flex justify-between border-t border-border pt-2 font-display text-lg font-extrabold"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            <div className="mt-1 text-muted-foreground">
              Pagamento: <span className="text-foreground">{order.payment}{order.payment === "Dinheiro" && order.changeFor ? ` (troco p/ ${order.changeFor})` : ""}</span>
            </div>
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
