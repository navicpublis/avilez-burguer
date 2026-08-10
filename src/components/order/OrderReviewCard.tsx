import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { submitReviewRemote, fetchOrderReviewStatus } from "@/lib/db";

/**
 * OrderReviewCard — avaliação pós-pedido na tela de acompanhamento.
 *
 * Aparece apenas quando o pedido está ENTREGUE (controlado pelo pai). Usa o
 * sistema de avaliações que já existe: envia pela RPC segura submit_review
 * (por public_token; o banco valida pedido entregue + ainda não avaliado +
 * UNIQUE(order_id)) e entra como "pendente" para a moderação do Admin.
 *
 * Ao (re)abrir, consulta no banco se o pedido já foi avaliado e, se sim, mostra
 * direto o agradecimento — não permite novo envio.
 */
export function OrderReviewCard({ token, customerName }: { token: string; customerName?: string }) {
  const firstName = (customerName || "").trim().split(/\s+/)[0] || "";

  const [phase, setPhase] = useState<"loading" | "form" | "done">("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao montar: descobre se o pedido já foi avaliado (evita piscar o formulário).
  useEffect(() => {
    let alive = true;
    if (!isSupabaseConfigured) {
      setPhase("form");
      return;
    }
    void fetchOrderReviewStatus(token).then((st) => {
      if (!alive) return;
      setPhase(st?.reviewed ? "done" : "form");
    });
    return () => {
      alive = false;
    };
  }, [token]);

  async function submit() {
    if (submitting || rating < 1) return; // exige ao menos 1 estrela
    setError(null);

    if (!isSupabaseConfigured) {
      setPhase("done"); // modo dev sem backend
      return;
    }

    setSubmitting(true);
    try {
      await submitReviewRemote(token, rating, comment.trim());
      setPhase("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("JA_AVALIADO")) {
        setPhase("done"); // já avaliado → agradecimento
      } else {
        // NÃO limpa o formulário nem marca como enviado.
        setError("Não conseguimos enviar sua avaliação. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // enquanto verifica no banco, não renderiza nada (não pisca o formulário)
  if (phase === "loading") return null;

  if (phase === "done") {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="font-condensed text-2xl uppercase text-primary">Valeu pela avaliação! 💛</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu feedback ajuda a Avilez Burguer a melhorar cada vez mais.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-center font-condensed text-2xl uppercase leading-tight">
        E aí{firstName ? `, ${firstName}` : ""}, curtiu seu pedido? 🍔
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Sua opinião é muito importante pra gente. Conta pra Avilez Burguer como foi sua experiência!
      </p>

      {/* estrelas — área de toque confortável (48px), estado claro, sem depender de hover */}
      <div className="mt-5 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} ${n > 1 ? "estrelas" : "estrela"}`}
            aria-pressed={n <= rating}
            onClick={() => setRating(n)}
            className="flex size-12 items-center justify-center rounded-lg transition-transform duration-100 active:scale-90"
          >
            <Star
              className={cn(
                "size-8 transition-colors",
                n <= rating ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/60"
              )}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Conta pra gente o que achou..."
        className="mt-4 w-full resize-none rounded-lg border border-border bg-secondary px-3.5 py-3 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      />

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || rating < 1}
        className="mt-4 h-12 w-full rounded-lg bg-primary font-extrabold uppercase tracking-wide text-primary-foreground transition-[background-color,transform] hover:bg-brand-yellow-soft active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Enviar avaliação"}
      </button>
    </div>
  );
}
