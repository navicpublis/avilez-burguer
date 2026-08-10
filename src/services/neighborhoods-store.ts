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

import { fetchZones, pushZones } from "@/lib/db";
import { subscribeZones } from "@/lib/realtime";
import { isSupabaseConfigured } from "@/lib/supabase";

const KEY = "avilez_neighborhoods";
// cache em memória (API síncrona preservada; Supabase hidrata no load)
let cache: Neighborhood[] | null = null;
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
    n("itacuruca", "Itacuruçá", 15, "60 a 70 min", false),
  ];
}

// ---------- persistência ----------
// Guarda anti-catástrofe: com Supabase, o seed antigo/localStorage NÃO pode
// virar autoridade. Só liberamos push/prune DEPOIS que a hidratação terminou,
// e NUNCA semeamos os bairros antigos quando o Supabase é a fonte.
let hydrated = false;

function read(): Neighborhood[] {
  if (cache) return cache;
  // Com Supabase configurado, o banco é a fonte. Antes de hidratar, devolve
  // vazio (não semeia os bairros antigos, não grava nada, não faz prune).
  if (isSupabaseConfigured) {
    cache = [];
    return cache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Neighborhood[];
      if (Array.isArray(list)) { cache = list; return cache; }
    }
  } catch {
    /* ignore */
  }
  const seeded = seed(); // fallback SÓ sem Supabase
  write(seeded);
  return seeded;
}
function write(list: Neighborhood[]): void {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
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
  // push/prune SOMENTE após uma alteração explícita do Admin E com a
  // hidratação concluída — nunca a partir de seed/estado antigo.
  if (isSupabaseConfigured && hydrated) void pushZones(list);
}

// hidratação Supabase → cache (fonte única de leitura quando há dados)
function hydrateZones() {
  void fetchZones().then((remote) => {
    // remote é [] quando o banco está vazio (banco vazio = lista vazia);
    // null só em erro de rede → aí mantém o que houver e NÃO marca hydrated.
    if (remote) {
      cache = remote;
      try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch { /* ignore */ }
      hydrated = true; // só a partir daqui o push/prune é liberado
      listeners.forEach((l) => l());
    }
  });
}
if (isSupabaseConfigured) {
  hydrateZones();
  // Realtime: criar/editar/desativar/apagar bairro no Admin reflete no site.
  subscribeZones(hydrateZones);
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
