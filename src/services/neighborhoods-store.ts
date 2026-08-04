/**
 * neighborhoods-store — FONTE ÚNICA dos bairros de entrega.
 *
 * Cada bairro tem nome, taxa de entrega, tempo médio e status (ativo/inativo).
 * O checkout carrega os bairros ATIVOS num Select e calcula a taxa a partir do
 * bairro escolhido. Persiste em localStorage ('avilez_neighborhoods') com
 * pub/sub — o formato já está pronto para uma futura tela de gestão no admin
 * e para o Supabase (basta trocar read/write mantendo as assinaturas).
 */

export interface Neighborhood {
  id: string;
  name: string;
  /** Taxa de entrega em reais. */
  fee: number;
  /** Tempo médio de entrega (texto livre, ex.: "30 a 40 min"). */
  avgTime: string;
  /** Bairro desativado não aparece no checkout e não permite finalizar. */
  active: boolean;
}

const KEY = "avilez_neighborhoods";
const CHANNEL = "avilez_neighborhoods_rt";

function uid(): string {
  return `bairro_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- seed ----------
function seed(): Neighborhood[] {
  const n = (
    id: string,
    name: string,
    fee: number,
    avgTime: string,
    active = true
  ): Neighborhood => ({ id, name, fee, avgTime, active });

  return [
    n("centro", "Centro", 6, "30 a 40 min"),
    n("praia-do-saco", "Praia do Saco", 8, "35 a 45 min"),
    n("ibicui", "Ibicuí", 9, "40 a 50 min"),
    n("sahy", "Sahy", 10, "45 a 55 min"),
    n("muriqui", "Muriqui", 12, "50 a 60 min"),
    n("vila-muriqui", "Vila Muriqui", 12, "50 a 60 min"),
    n("conceicao-jacarei", "Conceição de Jacareí", 14, "55 a 65 min"),
    n("itacurucá", "Itacuruçá", 15, "60 a 70 min", false),
  ];
}

// ---------- persistência ----------
function read(): Neighborhood[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Neighborhood[];
      if (Array.isArray(list)) return list;
    }
  } catch {
    /* ignore */
  }
  const seeded = seed();
  write(seeded);
  return seeded;
}
function write(list: Neighborhood[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  // FUTURO (Supabase): upsert em neighborhoods
}

// ---------- pub/sub ----------
type Listener = () => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => listeners.forEach((l) => l());
  }
}
function commit(list: Neighborhood[]) {
  write(list);
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
}
export function subscribe(cb: Listener): () => void {
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

// ---------- leitura ----------
export function listNeighborhoods(): Neighborhood[] {
  return [...read()].sort((a, b) => a.name.localeCompare(b.name));
}
/** Somente os ativos — é o que o checkout mostra. */
export function listActiveNeighborhoods(): Neighborhood[] {
  return listNeighborhoods().filter((n) => n.active);
}
export function getNeighborhood(id: string | null): Neighborhood | null {
  if (!id) return null;
  return read().find((n) => n.id === id) ?? null;
}

// ---------- CRUD (pronto para o painel admin) ----------
export type NeighborhoodInput = Omit<Neighborhood, "id">;
export function createNeighborhood(input: NeighborhoodInput): Neighborhood {
  const list = read();
  const item: Neighborhood = { ...input, id: uid() };
  list.push(item);
  commit(list);
  return item;
}
export function updateNeighborhood(id: string, patch: Partial<NeighborhoodInput>): void {
  const list = read();
  const i = list.findIndex((n) => n.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  commit(list);
}
export function deleteNeighborhood(id: string): void {
  commit(read().filter((n) => n.id !== id));
}
