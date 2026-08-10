import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronLeft, MessageCircle, Loader2 } from "lucide-react";

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
import { findProduct, findAddon } from "@/services/catalog-menu";
import {
  type CustomerData,
  type PaymentMethod,
  type Order,
  type OrderItem,
  generateOrderId,
  trackingUrl,
  saveOrder,
  whatsappUrl,
  placeRemoteOrder,
  type RemoteOrderPayload,
} from "@/services/orders";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useShop } from "@/store/shop-context";
import { useNeighborhoods, useSettings } from "@/hooks";

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

type Errors = Partial<Record<keyof CustomerData, string>>;

/**
 * CheckoutSheet — checkout em bottom sheet quase tela cheia, 4 passos:
 *   1) Dados do cliente  2) Endereço  3) Pagamento  4) Resumo
 * A taxa de entrega vem do BAIRRO escolhido (Select). Ao confirmar: gera ID +
 * link de rastreio, salva o pedido, abre o WhatsApp com a mensagem pronta e
 * mostra a tela de sucesso. Nunca troca de página.
 */
export function CheckoutSheet() {
  const {
    checkoutOpen,
    closeCheckout,
    cart,
    unitPrice,
    subtotal,
    fee,
    feeReady,
    discount,
    total,
    coupon,
    applyCoupon,
    neighborhoodId,
    setNeighborhoodId,
    customer,
    saveCustomer,
    clear,
  } = useShop();

  const neighborhoods = useNeighborhoods();
  const { storeOpen } = useSettings();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CustomerData>(customer ?? EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [payment, setPayment] = useState<PaymentMethod>("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState(coupon ?? "");
  const [couponNotice, setCouponNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // ao abrir: passo 1, recarrega dados salvos e tenta casar o bairro salvo
  useEffect(() => {
    if (!checkoutOpen) return;
    setStep(1);
    setForm(customer ?? EMPTY);
    setErrors({});
    setPlaced(null);
    setOrderError(null);
    setSubmitting(false);
    setCouponCode(coupon ?? "");
    setCouponNotice(null);
    if (customer?.neighborhood) {
      const match = neighborhoods.find(
        (n) => n.name.toLowerCase() === customer.neighborhood.toLowerCase()
      );
      if (match) setNeighborhoodId(match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, customer]);

  const set = (k: keyof CustomerData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function selectNeighborhood(id: string) {
    setNeighborhoodId(id || null);
    const n = neighborhoods.find((x) => x.id === id);
    setForm((f) => ({ ...f, neighborhood: n?.name ?? "" }));
    setErrors((e) => ({ ...e, neighborhood: undefined }));
  }

  function validateStep1(): boolean {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Informe seu nome";
    const digits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "Informe seu WhatsApp";
    else if (digits.length < 10) e.phone = "Número incompleto";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const selectedHoodEarly = neighborhoods.find((n) => n.id === neighborhoodId) ?? null;
  // "Retirada no local" é um bairro de taxa 0 — detectado pelo nome.
  const isPickupSelected = !!selectedHoodEarly && /retirada/i.test(selectedHoodEarly.name);

  function validateStep2(): boolean {
    const e: Errors = {};
    if (!neighborhoodId || !feeReady) e.neighborhood = "Selecione um bairro";
    // Retirada no local: não exige endereço de entrega.
    if (!isPickupSelected) {
      if (!form.street.trim()) e.street = "Informe a rua";
      if (!form.number.trim()) e.number = "Nº";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const selectedHood = selectedHoodEarly;

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

  function handleCoupon() {
    if (!couponCode.trim()) return;
    const ok = applyCoupon(couponCode);
    setCouponNotice(
      ok
        ? { ok: true, msg: "Cupom aplicado com sucesso." }
        : { ok: false, msg: "Cupom incorreto ou indisponível." }
    );
    window.setTimeout(() => setCouponNotice(null), 3000);
  }

  const canConfirm = feeReady && cart.length > 0 && !submitting && storeOpen;

  async function confirm() {
    if (!canConfirm) return;

    // Abre a aba do WhatsApp AINDA no gesto do clique (antes de qualquer await).
    // Sem isso, Safari/iPhone e Chrome Android bloqueiam o window.open que
    // acontece depois do await do create_order (popup bloqueado).
    let waWindow: Window | null = null;
    try {
      waWindow = window.open("", "_blank");
    } catch {
      waWindow = null;
    }

    setSubmitting(true);
    setOrderError(null);

    const localId = generateOrderId();
    let orderId = localId;
    let tracking = trackingUrl(localId);

    try {
      // Com Supabase ativo: o pedido é SALVO NO BANCO antes de abrir o WhatsApp.
      // O servidor calcula taxa/desconto e devolve order_number + public_token.
      if (isSupabaseConfigured) {
        const payload: RemoteOrderPayload = {
          customer: { name: form.name, phone: form.phone },
          address: {
            street: form.street, number: form.number, complement: form.complement,
            reference: form.reference, cep: form.cep,
          },
          delivery_zone_id: neighborhoodId ?? "",
          payment_method: payment,
          change_for: payment === "Dinheiro" && changeFor ? changeFor.replace(",", ".") : null,
          coupon_code: coupon,
          customer_notes: notes.trim(),
          items: cart.map((it) => {
            const p = findProduct(it.id);
            return {
              product_id: it.id,
              name: p?.name ?? it.id,
              unit_price: p?.price ?? 0, // base; a RPC soma os adicionais
              quantity: it.qty,
              notes: it.obs,
              addons: it.addons.map((a) => {
                const ad = findAddon(a);
                return { name: ad?.name ?? a, price: ad?.price ?? 0 };
              }),
            };
          }),
        };
        const res = await placeRemoteOrder(payload); // lança erro se falhar
        orderId = res.orderNumber;
        tracking = trackingUrl(res.publicToken);
      }

      const order: Order = {
        id: orderId,
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
        notes: notes.trim() || undefined,
        trackingUrl: tracking,
      };
      saveCustomer(form);
      saveOrder(order); // mantém uma cópia local (o admin vê no mesmo dispositivo)

      // Monta a URL do WhatsApp SEMPRE nova (a partir deste pedido).
      const wa = whatsappUrl(order);
      clear(); // limpa o carrinho SÓ após o pedido ter sido criado com sucesso
      setPlaced(order);
      setStep(5);

      // Abre o WhatsApp: usa a aba já aberta no clique; se foi bloqueada,
      // navega na própria aba (garantido no mobile, sem popup).
      if (waWindow && !waWindow.closed) {
        waWindow.location.href = wa;
      } else {
        window.location.href = wa;
      }
    } catch {
      // Falhou salvar no Supabase: NÃO abrir WhatsApp, avisar pela UI existente.
      if (waWindow && !waWindow.closed) {
        try { waWindow.close(); } catch { /* ignore */ }
      }
      setOrderError("Não foi possível registrar seu pedido agora. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const success = step === 5 && placed;
  const feeLabel = feeReady ? (fee > 0 ? formatCurrency(fee) : "Grátis") : "A calcular";
  const stepTitles = ["Seus dados", "Endereço", "Pagamento", "Resumo"];

  return (
    <Sheet open={checkoutOpen} onOpenChange={(o: boolean) => !o && closeCheckout()}>
      <SheetContent side="bottom" className="h-[95dvh]">
        <SheetHeader className="flex-row items-center gap-3 pb-2 pr-12">
          {step > 1 && step < 5 && (
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => setStep((s) => s - 1)}
              className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <SheetTitle>{success ? "Quase lá!" : stepTitles[step - 1]}</SheetTitle>
        </SheetHeader>

        {!success && (
          <div className="px-6 pb-3">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <span
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-hover",
                    s <= step ? "bg-primary" : "bg-secondary"
                  )}
                />
              ))}
            </div>
            <div className="mt-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Passo {step} de 4
            </div>
          </div>
        )}

        <SheetBody className="overflow-x-hidden">
          {/* PASSO 1 — Dados do cliente */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Field label="Nome" error={errors.name}>
                <input
                  className={inputCls(errors.name)}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                />
              </Field>
              <Field label="Telefone (WhatsApp)" error={errors.phone}>
                <input
                  className={inputCls(errors.phone)}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(21) 99999-9999"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>
          )}

          {/* PASSO 2 — Endereço */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                <Field label="Rua" error={errors.street}>
                  <input className={inputCls(errors.street)} value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Rua / Avenida" autoComplete="address-line1" />
                </Field>
                <Field label="Número" error={errors.number}>
                  <input className={inputCls(errors.number)} value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="123" inputMode="numeric" />
                </Field>
              </div>
              <Field label="Complemento (opcional)">
                <input className={inputCls()} value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Apto, bloco, casa..." />
              </Field>

              <Field label="Bairro" error={errors.neighborhood}>
                <div className="relative">
                  <select
                    className={cn(selectCls(errors.neighborhood), "appearance-none pr-10")}
                    value={neighborhoodId ?? ""}
                    onChange={(e) => selectNeighborhood(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione seu bairro
                    </option>
                    {neighborhoods.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} · {n.fee > 0 ? formatCurrency(n.fee) : "Grátis"}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-muted-foreground" />
                </div>
                {selectedHood && (
                  <p className="mt-1.5 text-[0.8rem] text-muted-foreground">
                    Taxa {selectedHood.fee > 0 ? formatCurrency(selectedHood.fee) : "grátis"} · entrega em {selectedHood.avgTime}
                  </p>
                )}
              </Field>

              <Field label="Ponto de referência (opcional)">
                <input className={inputCls()} value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Perto de..." />
              </Field>
              <Field label="CEP (opcional)">
                <input className={inputCls()} value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" />
              </Field>
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
                      "flex items-center justify-between rounded-lg border bg-secondary px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
                      on ? "border-primary" : "border-border hover:bg-accent"
                    )}
                  >
                    <span className="font-semibold">{p}</span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
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

              <div className="mt-3">
                <label className="mb-1.5 block text-[0.85rem] font-semibold">Observações (opcional)</label>
                <textarea
                  className={cn(inputCls(), "h-24 resize-none py-2.5")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguma observação para a cozinha ou a entrega?"
                />
              </div>
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

              <div className="mt-1 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Cupom de desconto"
                  className={cn(inputCls(), "uppercase placeholder:normal-case")}
                />
                <button
                  type="button"
                  onClick={handleCoupon}
                  disabled={!couponCode.trim()}
                  className="h-12 shrink-0 rounded-md border border-border bg-secondary px-4 text-[0.85rem] font-bold text-foreground transition-colors hover:bg-accent active:scale-[0.98] disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
              {couponNotice && (
                <p className={cn("text-xs font-medium", couponNotice.ok ? "text-emerald-400" : "text-red-400")}>
                  {couponNotice.msg}
                </p>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <Row label="Subtotal" value={formatCurrency(subtotal)} muted />
                <Row label="Taxa de entrega" value={feeLabel} muted />
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
                {selectedHood ? ` · Entrega em ${selectedHood.avgTime}` : ""}
              </p>
            </div>
          )}

          {/* PASSO 5 — Sucesso */}
          {success && placed && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span className="flex size-16 animate-scale-in items-center justify-center rounded-full bg-primary">
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
            <button type="button" onClick={() => validateStep1() && setStep(2)} className={ctaCls}>
              Continuar
            </button>
          )}
          {step === 2 && (
            <button type="button" onClick={() => validateStep2() && setStep(3)} className={ctaCls}>
              Continuar
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={() => setStep(4)} className={ctaCls}>
              Revisar pedido
            </button>
          )}
          {step === 4 && !storeOpen && (
            <p className="mb-2 rounded-md bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-300">
              Loja fechada no momento — não é possível finalizar agora.
            </p>
          )}
          {step === 4 && orderError && (
            <p className="mb-2 rounded-md bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-300">
              {orderError}
            </p>
          )}
          {step === 4 && (
            <button
              type="button"
              onClick={confirm}
              disabled={!canConfirm}
              className={cn(ctaCls, "gap-2 disabled:opacity-60")}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Enviando...
                </>
              ) : (
                <>Confirmar Pedido · {formatCurrency(total)}</>
              )}
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
                className="h-12 rounded-lg border-[1.5px] border-border font-bold text-foreground transition-colors hover:bg-secondary active:scale-[0.99]"
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
  "flex h-14 w-full items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground transition-[background-color,transform] duration-hover ease-brand hover:bg-brand-yellow-soft active:scale-[0.99] disabled:pointer-events-none";

/** Inputs com fonte 16px (text-base) para não disparar zoom no iOS. */
function inputCls(error?: string) {
  return cn(
    "h-12 w-full rounded-md border bg-secondary px-3.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
    error ? "border-red-500/70" : "border-border focus-visible:border-primary"
  );
}
function selectCls(error?: string) {
  return cn(
    "h-12 w-full rounded-md border bg-secondary px-3.5 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
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
