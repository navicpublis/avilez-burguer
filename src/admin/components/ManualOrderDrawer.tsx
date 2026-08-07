import { useMemo, useState } from "react";
import { X, Plus, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { useCatalog, useNeighborhoods } from "@/hooks";
import {
  type CustomerData,
  type PaymentMethod,
  type Order,
  type OrderItem,
  generateOrderId,
  trackingUrl,
} from "@/services/orders";
import { createManualOrder } from "@/services/orders-store";

const PAYMENTS: PaymentMethod[] = ["PIX", "Dinheiro", "Cartão na Entrega"];

/** Drawer de criação manual de pedido (entra com status "Recebido"). */
export function ManualOrderDrawer({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const catalog = useCatalog();
  const neighborhoods = useNeighborhoods();

  const products = useMemo(
    () => catalog.products.filter((p) => p.status === "disponivel"),
    [catalog.products]
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("PIX");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const nb = neighborhoods.find((n) => n.id === neighborhoodId) ?? null;
  const fee = nb ? nb.fee : 0;

  const items = useMemo(
    () =>
      products
        .filter((p) => (qty[p.id] ?? 0) > 0)
        .map((p) => ({ p, q: qty[p.id] })),
    [products, qty]
  );
  const subtotal = items.reduce((s, { p, q }) => s + p.price * q, 0);
  const total = subtotal + fee;

  if (!open) return null;

  function setItemQty(id: string, delta: number) {
    setQty((m) => {
      const next = Math.max(0, (m[id] ?? 0) + delta);
      return { ...m, [id]: next };
    });
  }

  function save() {
    if (!name.trim()) return setError("Informe o nome do cliente.");
    if (!phone.trim()) return setError("Informe o telefone.");
    if (items.length === 0) return setError("Adicione ao menos um produto.");
    if (!nb) return setError("Selecione o bairro de entrega.");

    const customer: CustomerData = {
      name: name.trim(),
      phone: phone.trim(),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: nb.name,
      reference: reference.trim(),
      cep: "",
    };
    const orderItems: OrderItem[] = items.map(({ p, q }) => ({
      name: p.name,
      qty: q,
      addons: [],
      obs: "",
      unitPrice: p.price,
      lineTotal: p.price * q,
    }));
    const id = generateOrderId();
    const order: Order = {
      id,
      createdAt: new Date().toISOString(),
      status: "recebido",
      customer,
      payment,
      changeFor: null,
      items: orderItems,
      subtotal,
      fee,
      discount: 0,
      coupon: null,
      total,
      trackingUrl: trackingUrl(id),
    };
    createManualOrder(order);
    onSaved?.(id);
    onClose();
  }

  const field = "h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-lg font-bold">Novo pedido manual</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Cliente</div>
          <div className="mt-2 flex flex-col gap-2">
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" inputMode="tel" />
            <div className="grid grid-cols-[1fr_4.5rem] gap-2">
              <input className={field} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua" />
              <input className={field} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Nº" />
            </div>
            <input className={field} value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento (opcional)" />
            <select className={field} value={neighborhoodId} onChange={(e) => setNeighborhoodId(e.target.value)}>
              <option value="">Selecione o bairro</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>{n.name} · {n.fee > 0 ? formatCurrency(n.fee) : "Grátis"}</option>
              ))}
            </select>
            <input className={field} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referência (opcional)" />
          </div>

          <div className="mt-6 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Produtos</div>
          {products.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum produto disponível no catálogo.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {products.map((p) => {
                const q = qty[p.id] ?? 0;
                return (
                  <div key={p.id} className={cn("flex items-center gap-2 rounded-md border px-3 py-2", q > 0 ? "border-primary/50 bg-primary/5" : "border-border")}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(p.price)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setItemQty(p.id, -1)} disabled={q === 0} className="flex size-8 items-center justify-center rounded-md border border-border text-foreground disabled:opacity-40 hover:bg-accent">
                        <Minus className="size-4" />
                      </button>
                      <span className="w-5 text-center font-display font-bold">{q}</span>
                      <button type="button" onClick={() => setItemQty(p.id, 1)} className="flex size-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-accent">
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-[0.72rem] font-bold uppercase tracking-wider text-muted-foreground">Pagamento</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PAYMENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPayment(p)}
                className={cn(
                  "rounded-md border px-2 py-2 text-xs font-bold transition-colors",
                  payment === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {p === "Cartão na Entrega" ? "Cartão" : p}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Taxa de entrega</span><span>{nb ? (fee > 0 ? formatCurrency(fee) : "Grátis") : "A calcular"}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-2 font-display text-lg font-extrabold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={save}
            className="h-12 w-full rounded-lg bg-primary font-bold text-primary-foreground transition-colors hover:bg-brand-yellow-soft active:scale-[0.99]"
          >
            Criar pedido
          </button>
        </div>
      </aside>
    </>
  );
}
