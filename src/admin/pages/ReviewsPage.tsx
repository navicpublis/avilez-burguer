import { useMemo, useState } from "react";
import { Star, Check, X, EyeOff, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useReviews } from "@/hooks";
import { setReviewStatus, deleteReview, type ReviewStatus } from "@/services/reviews-store";

type Filter = "pendente" | "aprovada" | "reprovada" | "todas";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pendente", label: "Pendentes" },
  { key: "aprovada", label: "Aprovadas" },
  { key: "reprovada", label: "Reprovadas" },
  { key: "todas", label: "Todas" },
];

const STATUS_TONE: Record<ReviewStatus, string> = {
  pendente: "bg-amber-500/15 text-amber-400",
  aprovada: "bg-emerald-500/15 text-emerald-400",
  reprovada: "bg-red-500/15 text-red-400",
  oculta: "bg-secondary text-muted-foreground",
};
const STATUS_LABEL: Record<ReviewStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
  oculta: "Oculta",
};

/** Moderação de avaliações. Só aprovadas aparecem na Landing. */
export function ReviewsPage() {
  const reviews = useReviews();
  const [filter, setFilter] = useState<Filter>("pendente");

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: reviews.length };
    reviews.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [reviews]);

  const list = useMemo(
    () => reviews.filter((r) => filter === "todas" || r.status === filter),
    [reviews, filter]
  );

  return (
    <main className="w-full max-w-[1100px] px-4 py-7 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="font-condensed text-[2.2rem] uppercase leading-none tracking-tight">Avaliações</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Modere antes de publicar — só aprovadas aparecem no site.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors", filter === f.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {f.label}
            <span className={cn("rounded-full px-1.5 text-xs", filter === f.key ? "bg-primary/20" : "bg-secondary")}>{f.key === "todas" ? counts.todas ?? 0 : counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          {reviews.length === 0 ? "Nenhuma avaliação recebida ainda." : "Nenhuma avaliação neste filtro."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">{r.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider", STATUS_TONE[r.status])}>{STATUS_LABEL[r.status]}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("size-4", i < r.rating ? "fill-primary text-primary" : "text-muted-foreground")} />
                    ))}
                    {r.orderId && <span className="ml-2 text-xs text-muted-foreground">Pedido #{r.orderId}</span>}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>

              {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "aprovada" && (
                  <button type="button" onClick={() => setReviewStatus(r.id, "aprovada")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"><Check className="size-4" /> Aprovar</button>
                )}
                {r.status !== "reprovada" && (
                  <button type="button" onClick={() => setReviewStatus(r.id, "reprovada")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-500/40 px-3 text-sm font-semibold text-red-400 hover:bg-red-500/10"><X className="size-4" /> Reprovar</button>
                )}
                {r.status !== "oculta" && (
                  <button type="button" onClick={() => setReviewStatus(r.id, "oculta")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"><EyeOff className="size-4" /> Ocultar</button>
                )}
                <button type="button" onClick={() => { if (confirm("Excluir esta avaliação?")) deleteReview(r.id); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-muted-foreground hover:border-red-500 hover:text-red-400"><Trash2 className="size-4" /> Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
