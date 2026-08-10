import { useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { confirmOrderReceived } from "@/lib/db";

/**
 * OrderReceivedConfirm — o próprio cliente confirma que recebeu o pedido.
 *
 * Renderizado pelo acompanhamento SOMENTE quando o status é "entrega" (saiu
 * para entrega). Usa a RPC segura confirm_order_received (por public_token), que
 * só faz a transição 'entrega' → 'entregue', grava delivered_at e registra o
 * histórico. Após confirmar, o Realtime existente atualiza a tela para
 * "Entregue" e o card de avaliação aparece — sem nova subscription aqui.
 *
 * Tem passo de confirmação (evita toque acidental) e é blindado contra duplo
 * clique (botão desabilitado + "Confirmando…"); a RPC também é idempotente.
 */
export function OrderReceivedConfirm({ token }: { token: string }) {
  const [confirming, setConfirming] = useState(false); // mostra o passo "Confirmar recebimento?"
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (submitting) return;
    setError(null);

    if (!isSupabaseConfigured) {
      setDone(true);
      return;
    }

    setSubmitting(true);
    try {
      await confirmOrderReceived(token);
      setDone(true); // feedback imediato; o Realtime vira o status p/ "Entregue"
    } catch {
      setError("Não conseguimos confirmar agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="font-condensed text-2xl uppercase text-primary">Recebimento confirmado! 💛</div>
        <p className="mt-2 text-sm text-muted-foreground">Já já seu pedido aparece como entregue aqui.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center">
      <h2 className="font-condensed text-2xl uppercase leading-tight">Seu pedido chegou? 🍔</h2>

      {!confirming ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Se você já recebeu seu pedido, confirme aqui pra gente.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 h-12 w-full rounded-lg bg-primary font-extrabold uppercase tracking-wide text-primary-foreground transition-[background-color,transform] hover:bg-brand-yellow-soft active:scale-[0.99]"
          >
            Já recebi meu pedido
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-bold text-foreground">Confirmar recebimento?</p>
          <p className="mt-1 text-sm text-muted-foreground">Confirme somente se o seu pedido já chegou.</p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="h-12 w-full rounded-lg bg-primary font-extrabold uppercase tracking-wide text-primary-foreground transition-[background-color,transform] hover:bg-brand-yellow-soft active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? "Confirmando…" : "Sim, já recebi"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={submitting}
              className="h-11 w-full rounded-lg border border-border font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
