/**
 * settings-store — FONTE ÚNICA das configurações do site/painel.
 * Negócio (nome, contatos, cidade), horários, status da loja (aberta/
 * fechada), perfil do admin e visibilidade/textos das seções da landing.
 * Persiste em 'avilez_settings' com pub/sub. Os defaults espelham o
 * site-config atual, então nada muda visualmente até o admin editar.
 */

export interface BusinessSettings {
  name: string;
  description: string;
  whatsapp: string; // E.164 sem símbolos
  whatsappDisplay: string;
  instagram: string; // handle @...
  facebook: string;
  city: string;
  state: string;
}

export interface HoursRow {
  id: string;
  days: string;
  time: string | null; // null = "A definir"
}

export interface AdminProfile {
  displayName: string;
  role: string;
  email: string;
  photo: string | null;
}

/** Chaves das seções editáveis/ocultáveis da landing. */
export type SectionKey = "hamburgueres" | "avaliacoes" | "entrega" | "localizacao" | "pedir";

export interface LandingSettings {
  heroTitle: string;
  ctaTitle: string;
  deliveryInfo: string;
  /** visibilidade por seção (a estrutura visual nunca é destruída). */
  sectionsVisible: Record<SectionKey, boolean>;
}

export interface Settings {
  business: BusinessSettings;
  hours: HoursRow[];
  storeOpen: boolean;
  admin: AdminProfile;
  landing: LandingSettings;
}

import { fetchSettings, pushSettings, pushStoreOpen } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

const KEY = "avilez_settings";
// cache em memória (API síncrona preservada; Supabase hidrata no load)
let cache: Settings | null = null;
const CHANNEL = "avilez_settings_rt";

function defaults(): Settings {
  return {
    business: {
      name: "Avilez Burguer",
      description: "Hambúrgueres feitos na chapa, preparados na hora com ingredientes selecionados.",
      whatsapp: "5521971902603",
      whatsappDisplay: "(21) 97190-2603",
      instagram: "@avilezburguer",
      facebook: "Avilez Burguer",
      city: "Mangaratiba",
      state: "RJ",
    },
    hours: [
      { id: "seg-qui", days: "Segunda a Quinta", time: "18h às 23h" },
      { id: "sex-dom", days: "Sexta a Domingo", time: "18h às 00h" },
    ],
    storeOpen: true,
    admin: {
      displayName: "Avilez Burguer",
      role: "Administrador",
      email: "avilezburguer@gmail.com",
      photo: null,
    },
    landing: {
      heroTitle: "O melhor da Costa Verde.",
      ctaTitle: "Bateu a fome?",
      deliveryInfo: "Entrega rápida em Mangaratiba e região.",
      sectionsVisible: {
        hamburgueres: true,
        avaliacoes: true,
        entrega: true,
        localizacao: true,
        pedir: true,
      },
    },
  };
}

function mergeDefaults(parsed: Partial<Settings>): Settings {
  const d = defaults();
  return {
    business: { ...d.business, ...parsed.business },
    hours: parsed.hours?.length ? parsed.hours : d.hours,
    storeOpen: typeof parsed.storeOpen === "boolean" ? parsed.storeOpen : d.storeOpen,
    admin: { ...d.admin, ...parsed.admin },
    landing: {
      ...d.landing, ...parsed.landing,
      sectionsVisible: { ...d.landing.sectionsVisible, ...parsed.landing?.sectionsVisible },
    },
  };
}
function read(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      cache = mergeDefaults(parsed);
      return cache;
    }
  } catch {
    /* ignore */
  }
  return defaults();
}

let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
function ensureChannel() {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => listeners.forEach((l) => l());
  }
}
function write(s: Settings): void {
  cache = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
  if (isSupabaseConfigured) void pushSettings(s);
}

// hidratação Supabase → cache (config compartilhada entre dispositivos)
export function hydrateSettings() {
  void fetchSettings().then((remote) => {
    if (remote) {
      cache = mergeDefaults(remote);
      try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
      listeners.forEach((l) => l());
    }
  });
}
// No load, busca o estado atual do Supabase (config compartilhada). A
// subscription Realtime de loja aberta/fechada é gerenciada por
// useStoreStatusSync() (com cleanup e re-fetch ao reconectar).
if (isSupabaseConfigured) {
  hydrateSettings();
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

export function getSettings(): Settings {
  return read();
}

export function updateBusiness(patch: Partial<BusinessSettings>): void {
  const s = read();
  write({ ...s, business: { ...s.business, ...patch } });
}
export function updateAdmin(patch: Partial<AdminProfile>): void {
  const s = read();
  write({ ...s, admin: { ...s.admin, ...patch } });
}
export function updateLanding(patch: Partial<LandingSettings>): void {
  const s = read();
  write({ ...s, landing: { ...s.landing, ...patch } });
}
export function toggleSection(key: SectionKey, visible: boolean): void {
  const s = read();
  write({ ...s, landing: { ...s.landing, sectionsVisible: { ...s.landing.sectionsVisible, [key]: visible } } });
}
export function setHours(hours: HoursRow[]): void {
  const s = read();
  write({ ...s, hours });
}
export function setStoreOpen(open: boolean): void {
  const s = read();
  const next = { ...s, storeOpen: open };
  // persiste local (UI instantânea) + escrita DEDICADA da chave "store" no
  // Supabase (confiável, sem depender do upsert das demais configurações).
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  ensureChannel();
  channel?.postMessage("changed");
  listeners.forEach((l) => l());
  if (isSupabaseConfigured) void pushStoreOpen(open);
}

/** Próximo horário de funcionamento (texto) para exibir quando fechado. */
export function nextOpeningText(): string {
  const s = read();
  const first = s.hours.find((h) => h.time);
  return first ? `${first.days}: ${first.time}` : "em breve";
}
