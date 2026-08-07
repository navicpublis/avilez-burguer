/**
 * reviews-store — FONTE ÚNICA das avaliações. Fluxo de moderação:
 * pendente → aprovada / reprovada / oculta. Só APROVADAS aparecem na
 * Landing. Persiste em 'avilez_reviews' com pub/sub. Nada é publicado
 * automaticamente sem moderação.
 */

export type ReviewStatus = "pendente" | "aprovada" | "reprovada" | "oculta";

export interface Review {
  id: string;
  name: string;
  orderId: string | null;
  rating: number; // 1..5
  comment: string;
  createdAt: string;
  status: ReviewStatus;
}

const KEY = "avilez_reviews";
const CHANNEL = "avilez_reviews_rt";

function uid(): string {
  return `rev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function read(): Review[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => listeners.forEach((l) => l());
  }
}
function write(list: Review[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
}
export function subscribe(cb: () => void): () => void {
  ensureChannel();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function listReviews(): Review[] {
  return [...read()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export function listApproved(): Review[] {
  return listReviews().filter((r) => r.status === "aprovada");
}

/** Cliente envia avaliação — entra sempre como "pendente". */
export function submitReview(input: { name: string; orderId?: string | null; rating: number; comment: string }): Review {
  const list = read();
  const r: Review = {
    id: uid(),
    name: input.name.trim(),
    orderId: input.orderId ?? null,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
    status: "pendente",
  };
  list.push(r);
  write(list);
  return r;
}

export function setReviewStatus(id: string, status: ReviewStatus): void {
  const list = read();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], status };
  write(list);
}
export function deleteReview(id: string): void {
  write(read().filter((r) => r.id !== id));
}
