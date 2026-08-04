import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronLeft, MessageCircle } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { findProduct, findAddon } from "@/services/menu-data";
import {
  type CustomerData,
  type PaymentMethod,
  type Order,
  type OrderItem,
  generateOrderId,
  trackingUrl,
  saveOrder,
  whatsappUrl,
} from "@/services/orders";
import { useShop } from "@/store/shop-context";

const EMPTY: CustomerData = {
  name: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  reference: "",
  cep: "",
};

const PAYMENTS: PaymentMethod[] = ["PIX", "Dinheiro", "Cartão na Entrega"];
const ETA = "35 a 45 minutos";

type Errors = Partial<Record<keyof CustomerData, string>>;

/**
 * CheckoutSheet — checkout em bottom sheet quase tela cheia.
 * 4 passos (Dados → Entrega → Pagamento → Resumo) → Confirmar Pedido:
 * gera ID + link de rastreio, salva o pedido, abre o WhatsApp com a
 * mensagem pronta e mostra a tela de sucesso. Nunca troca de página.
 */
export function CheckoutSheet() {
  const {
    checkoutOpen,
    closeCheckout,
    cart,
    unitPrice,
    subtotal,
    fee,
    discount,
    total,
    coupon,
    customer,
    saveCustomer,
    clear,
  } = useShop();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CustomerData>(customer ?? EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<PaymentMethod>("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [placed, setPlaced] = useState<Order | null>(null);

  // ao abrir, começa no passo 1 e recarrega dados salvos do cliente
  useEffect(() => {
    if (checkoutOpen) {
      setStep(1);
      setForm(customer ?? EMPTY);
      setErrors({});
      setPlaced(null);
    }
  }, [checkoutOpen, customer]);

  const set = (k: keyof CustomerData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function validateCustomer(): boolean {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Informe seu nome";
    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "Informe seu WhatsApp";
    else if (digits.length < 10) e.phone = "Número incompleto";
    if (!form.street.trim()) e.street = "Informe a rua";
    if (!form.number.trim()) e.number = "Nº";
    if (!form.neighborhood.trim()) e.neighborhood = "Informe o bairro";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const orderItems: OrderItem[] = useMemo(
    () =>
      cart.map((it) => {
        const p = findProduct(it.id);
        const addons = it.addons.map((a) => findAddon(a)?.name ?? a);
        const u = unitPrice(it);
        return {
          name: p?.name ?? it.id,
          qty: it.qty,
          addons,
          obs: it.obs,
          unitPrice: u,
          lineTotal: u * it.qty,
        };
      }),
    [cart, unitPrice]
  );

  function confirm() {
    const id = generateOrderId();
    const order: Order = {
      id,
      createdAt: new Date().toISOString(),
      status: "Aguardando envio",
      customer: form,
      payment,
      changeFor: payment === "Dinheiro" && changeFor ? changeFor : null,
      items: orderItems,
      subtotal,
      fee,
      discount,
      coupon,
      total,
      trackingUrl: trackingUrl(id),
    };
    saveCustomer(form);
    saveOrder(order);
    setPlaced(order);
    window.open(whatsappUrl(order), "_blank");
    clear();
    setStep(5);
  }

  const success = step === 5 && placed;

  return (
    <Sheet open={checkoutOpen} onOpenChange={(o: boolean) => !o && closeCheckout()}>
      <SheetContent side="bottom" className="h-[95dvh]">
        <SheetHeader className="flex-row items-center gap-3 pb-2 pr-12">
          {step > 1 && step < 5 && (
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => setStep((s) => s - 1)}
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <SheetTitle>{success ? "Quase lá!" : "Finalizar pedido"}</SheetTitle>
        </SheetHeader>

        {/* Progresso (some na tela de sucesso) */}
        {!success && (
          <div className="flex gap-1.5 px-6 pb-3">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-secondary"
                )}
              />
            ))}
          </div>
        )}

        <SheetBody>
          {/* PASSO 1 — Dados do cliente */}
          {step === 1 && (
            <div className="flex flex-col gap-3.5">
              <Field label="Nome" error={errors.name}>
                <input className={inputCls(errors.name)} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome" />
              </Field>
              <Field label="WhatsApp" error={errors.phone}>
                <input className={inputCls(errors.phone)} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(21) 99999-9999" inputMode="tel" />
              </Field>
              <div className="grid grid-cols-[1fr_5rem] gap-3">
                <Field label="Rua" error={errors.street}>
                  <input className={inputCls(errors.street)} value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Rua / Av." />
                </Field>
                <Field label="Número" error={errors.number}>
                  <input className={inputCls(errors.number)} value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="123" inputMode="numeric" />
                </Field>
              </div>
              <Field label="Complemento (opcional)">
                <input className={inputCls()} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Apto, bloco..." />
              </Field>
              <Field label="Bairro" error={errors.neighborhood}>
                <input className={inputCls(errors.neighborhood)} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Seu bairro" />
              </Field>
              <Field label="Ponto de referência (opcional)">
                <input className={inputCls()} value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Perto de..." />
              </Field>
              <Field label="CEP (opcional)">
                <input className={inputCls()} value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" inputMode="numeric" />
              </Field>
            </div>
          )}

          {/* PASSO 2 — Entrega */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
                <div className="mb-1 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Entregar em
                </div>
                <p className="text-[0.95rem] leading-relaxed text-foreground">
                  {form.street}, {form.number}
                  {form.complement ? ` — ${form.complement}` : ""}
                  <br />
                  {form.neighborhood}
                  {form.reference ? (
                    <>
                      <br />
                      <span className="text-muted-foreground">Ref.: {form.reference}</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3.5">
                <span className="text-[0.9rem] text-muted-foreground">Tempo estimado</span>
                <span className="font-display font-bold">{ETA}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3.5">
                <span className="text-[0.9rem] text-muted-foreground">Taxa de entrega</span>
                <span className="font-display font-bold">{formatCurrency(fee)}</span>
              </div>
            </div>
          )}

          {/* PASSO 3 — Pagamento */}
          {step === 3 && (
            <div className="flex flex-col gap-2.5">
              <div className="mb-1 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
                Forma de pagamento
              </div>
              {PAYMENTS.map((p) => {
                const on = payment === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayment(p)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border bg-secondary px-4 py-3.5 text-left transition-colors",
                      on ? "border-primary" : "border-border hover:bg-accent"
                    )}
                  >
                    <span className="font-semibold">{p}</span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        on ? "border-primary bg-primary" : "border-border"
                      )}
                    >
                      <Check className={cn("size-3 text-primary-foreground", on ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
              {payment === "Dinheiro" && (
                <div className="mt-2">
                  <label className="mb-1.5 block text-[0.85rem] font-semibold">Troco para quanto?</label>
                  <input
                    className={inputCls()}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    placeholder="Ex.: 100,00 (deixe vazio se não precisa)"
                    inputMode="decimal"
                  />
                </div>
              )}
              {payment === "PIX" && (
                <p className="mt-2 rounded-md bg-secondary px-3.5 py-2.5 text-[0.82rem] text-muted-foreground">
                  A chave PIX será enviada na confirmação pelo WhatsApp.
                </p>
              )}
            </div>
          )}

          {/* PASSO 4 — Resumo */}
          {step === 4 && (
            <div className="flex flex-col gap-3">
              {orderItems.map((it, i) => (
                <div key={i} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-bold">
                      {it.qty}× {it.name}
                    </span>
                    <span className="font-display font-extrabold">{formatCurrency(it.lineTotal)}</span>
                  </div>
                  {it.addons.length > 0 && (
                    <p className="mt-0.5 text-[0.8rem] text-muted-foreground">+ {it.addons.join(", ")}</p>
                  )}
                  {it.obs && <p className="mt-0.5 text-[0.8rem] italic text-muted-foreground">“{it.obs}”</p>}
                </div>
              ))}
              <div className="mt-1 flex flex-col gap-2">
                <Row label="Subtotal" value={formatCurrency(subtotal)} muted />
                <Row label="Entrega" value={formatCurrency(fee)} muted />
                {discount > 0 && (
                  <Row label={`Desconto (${coupon})`} value={`− ${formatCurrency(discount)}`} className="text-emerald-400" />
                )}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2 font-display text-xl font-extrabold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              <p className="mt-1 text-[0.8rem] text-muted-foreground">
                Pagamento: <span className="text-foreground">{payment}</span>
                {payment === "Dinheiro" && changeFor ? ` (troco p/ ${changeFor})` : ""}
              </p>
            </div>
          )}

          {/* PASSO 5 — Sucesso */}
          {success && placed && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-primary">
                <MessageCircle className="size-8 text-primary-foreground" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold">Seu pedido foi preparado.</h3>
                <p className="mt-1.5 max-w-[28ch] text-[0.95rem] text-muted-foreground">
                  Agora basta enviá-lo pelo WhatsApp para a Avilez Burguer.
                </p>
              </div>
              <div className="w-full rounded-lg border border-border bg-secondary p-4 text-left">
                <div className="text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">Pedido</div>
                <div className="font-display text-lg font-extrabold">{placed.id}</div>
                <div className="mt-2 text-[0.78rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Acompanhar
                </div>
                <a href={placed.trackingUrl} className="break-all text-[0.82rem] text-primary underline">
                  {placed.trackingUrl}
                </a>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          {step === 1 && (
            <button type="button" onClick={() => validateCustomer() && setStep(2)} className={ctaCls}>
              Continuar
            </button>
          )}
          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} className={ctaCls}>
              Continuar
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={() => setStep(4)} className={ctaCls}>
              Continuar
            </button>
          )}
          {step === 4 && (
            <button type="button" onClick={confirm} className={ctaCls}>
              Confirmar Pedido · {formatCurrency(total)}
            </button>
          )}
          {success && placed && (
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => window.open(whatsappUrl(placed), "_blank")}
                className={cn(ctaCls, "gap-2")}
              >
                <MessageCircle className="size-5" /> Abrir WhatsApp novamente
              </button>
              <button
                type="button"
                onClick={closeCheckout}
                className="h-12 rounded-lg border-[1.5px] border-border font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Voltar ao início
              </button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------- helpers de UI ----------
const ctaCls =
  "flex h-14 w-full items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99]";

function inputCls(error?: string) {
  return cn(
    "h-12 w-full rounded-md border bg-secondary px-3.5 text-[0.95rem] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
    error ? "border-red-500/70" : "border-border focus-visible:border-primary"
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[0.85rem] font-semibold text-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-[0.78rem] text-red-400">{error}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  className,
}: {
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-[0.92rem]",
        muted && "text-muted-foreground",
        className
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
