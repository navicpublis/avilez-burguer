import { MessageCircle } from "lucide-react";

import { Container } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { formatCurrency } from "@/utils/format";
import { WHATSAPP_NUMBER } from "@/services/orders";
import { useTrackedOrder } from "@/hooks";
import { OrderReviewCard } from "@/components/order/OrderReviewCard";
import { STATUS_META } from "@/services/order-status";
import { StatusBadge } from "@/components/order/StatusBadge";
import { OrderTimeline } from "@/components/order/OrderTimeline";

/**
 * OrderTrackingPage — página PÚBLICA do cliente (/pedido/:id).
 * Mostra só o pedido dele (nunca dados administrativos) e atualiza em
 * TEMPO REAL: quando o admin muda o status, esta tela reflete sozinha
 * (via subscribe do orders-store, sem recarregar).
 */
export function OrderTrackingPage({ id }: { id: string }) {
  const { order, loading } = useTrackedOrder(id);
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <Container className="mx-auto flex max-w-lg flex-col">
        <Logo theme="brand" className="mx-auto mb-8 h-12 w-auto" />

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Carregando seu pedido…</p>
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-condensed text-3xl uppercase">Pedido não encontrado</h1>
            <p className="mt-3 text-muted-foreground">
              Confira o link do seu pedido <span className="font-display text-foreground">#{id}</span>.
            </p>
            <a href="/" className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 font-bold text-primary-foreground hover:bg-brand-yellow-soft">
              Ir ao cardápio
            </a>
          </div>
        ) : (
          <>
            {/* cabeçalho do pedido */}
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <div className="text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">Pedido</div>
              <div className="font-display text-2xl font-extrabold text-primary">#{order.id}</div>
              <div className="mt-3 flex justify-center">
                <StatusBadge status={order.status} />
              </div>
              {order.status !== "entregue" && order.status !== "cancelado" && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Entrega prevista: <span className="font-bold text-foreground">35–45 minutos</span>
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{STATUS_META[order.status].desc}</p>
            </div>

            {/* timeline */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">Acompanhe seu pedido</div>
              <OrderTimeline status={order.status} history={order.history} />
            </div>

            {/* resumo */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">Resumo</div>
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-border py-2 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{it.qty}× {it.name}</div>
                    {it.addons.length > 0 && <div className="text-xs text-muted-foreground">+ {it.addons.join(", ")}</div>}
                    {it.obs && <div className="text-xs italic text-muted-foreground">“{it.obs}”</div>}
                  </div>
                  <div className="shrink-0 font-display text-sm font-bold">{formatCurrency(it.lineTotal)}</div>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Pagamento · {order.payment}</span>
                <span className="font-display text-lg font-extrabold">{formatCurrency(order.total)}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Feito em {new Date(order.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* avaliação pós-pedido — só quando ENTREGUE */}
            {order.status === "entregue" && (
              <>
                <OrderReviewCard token={id} customerName={order.customer?.name} />
                <a
                  href="/"
                  className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/40 font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
                >
                  Pedir novamente 🍔
                </a>
              </>
            )}

            {/* whatsapp + agradecimento */}
            <a href={waHref} target="_blank" rel="noreferrer" className="mt-4 flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft">
              <MessageCircle className="size-5" /> Falar com a Avilez Burguer
            </a>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Obrigado por escolher a <span className="font-display text-foreground">Avilez Burguer</span>. 🍔
            </p>
          </>
        )}
      </Container>
    </main>
  );
}
