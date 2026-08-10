/**
 * realtime.ts — camada única de Realtime do Supabase.
 *
 * Centraliza todas as subscriptions (nada de supabase.channel espalhado pela
 * UI). Cada função devolve um "unsubscribe" para o componente limpar no
 * unmount. Tudo é protegido por isSupabaseConfigured (no-op sem backend).
 *
 * Segurança (item 12):
 *  • ADMIN → postgres_changes em orders/order_status_history. O RLS garante
 *    que só um admin autenticado recebe (anon não recebe nada). Ativa sozinho
 *    quando o Auth entrar (Bloco 5), sem mudar este código.
 *  • CLIENTE público → NÃO assina a tabela orders. Escuta um Broadcast no
 *    tópico "order:<public_token>" (token = UUID secreto) e rebusca pela RPC
 *    segura. Nunca vê pedidos de outras pessoas.
 *  • LOJA aberta/fechada → app_settings tem SELECT público, então o cliente
 *    assina via postgres_changes normalmente.
 *
 * Reconexão: o cliente do Supabase reconecta os canais sozinho. Como as telas
 * SEMPRE buscam o estado atual ao montar (e a cada evento), um reconnect não
 * deixa status desatualizado.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

type Unsub = () => void;
const noop: Unsub = () => {};

/**
 * Acompanhamento do cliente: escuta o tópico do pedido (por public_token) e
 * chama onChange a cada atualização de status. Seguro para o público.
 */
export function subscribeOrderTracking(publicToken: string, onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase || !publicToken) return noop;
  const channel = supabase
    .channel(`order:${publicToken}`)
    .on("broadcast", { event: "status" }, () => onChange())
    .subscribe();
  return () => {
    try { supabase?.removeChannel(channel); } catch { /* ignore */ }
  };
}

/**
 * Admin: novos pedidos e mudanças de status/cancelamento em tempo real.
 * Só entrega eventos para admin autenticado (RLS) — ativa no Bloco 5.
 */
export function subscribeAdminOrders(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) return noop;
  const channel = supabase
    .channel("admin:orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "order_status_history" }, () => onChange())
    .subscribe();
  return () => {
    try { supabase?.removeChannel(channel); } catch { /* ignore */ }
  };
}

/**
 * Status da loja (aberta/fechada) em tempo real para o site público.
 * app_settings é público para leitura, então funciona para todos.
 */
export function subscribeStoreStatus(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) return noop;
  const channel = supabase
    .channel("public:store-status")
    .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () => onChange())
    .subscribe((status: string) => {
      // Ao (re)conectar, rebusca o estado atual — não depende só do evento.
      if (status === "SUBSCRIBED") onChange();
    });
  return () => {
    try { supabase?.removeChannel(channel); } catch { /* ignore */ }
  };
}

/**
 * Catálogo público (categorias/produtos/adicionais) em tempo real. Leitura é
 * pública (RLS), então o site reflete mudanças do Admin sem F5. Rebusca também
 * ao (re)conectar.
 */
export function subscribeCatalog(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) return noop;
  const channel = supabase
    .channel("public:catalog")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "addon_groups" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "addons" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "product_addon_groups" }, () => onChange())
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") onChange();
    });
  return () => {
    try { supabase?.removeChannel(channel); } catch { /* ignore */ }
  };
}

/** Bairros/taxas (delivery_zones) em tempo real — leitura pública (RLS). */
export function subscribeZones(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) return noop;
  const channel = supabase
    .channel("public:zones")
    .on("postgres_changes", { event: "*", schema: "public", table: "delivery_zones" }, () => onChange())
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") onChange();
    });
  return () => {
    try { supabase?.removeChannel(channel); } catch { /* ignore */ }
  };
}
