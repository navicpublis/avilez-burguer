/**
 * realtime.ts — camada única de Realtime do Supabase.
 *
 * Centraliza as subscriptions e devolve uma função de cleanup
 * para cada assinatura.
 */

import { supabase, isSupabaseConfigured } from "./supabase";

type Unsub = () => void;

const noop: Unsub = () => {};

function uniqueChannelName(prefix: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}:${id}`;
}

/**
 * Acompanhamento público de um pedido.
 *
 * O nome deste canal NÃO deve ser aleatório, pois o cliente precisa
 * escutar exatamente o tópico correspondente ao public_token.
 */
export function subscribeOrderTracking(
  publicToken: string,
  onChange: () => void
): Unsub {
  if (!isSupabaseConfigured || !supabase || !publicToken) {
    return noop;
  }

  const client = supabase;

  const channel = client
    .channel(`order:${publicToken}`)
    .on("broadcast", { event: "status" }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

/**
 * Admin — novos pedidos e alterações de status.
 *
 * IMPORTANTE:
 * Usa um nome de canal único para impedir colisões quando React
 * desmonta/remonta componentes ou quando existe mais de uma
 * subscription durante uma troca de tela.
 */
export function subscribeAdminOrders(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) {
    return noop;
  }

  const client = supabase;

  const channel = client
    .channel(uniqueChannelName("admin-orders"))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_status_history",
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

/**
 * Status aberto/fechado da loja.
 *
 * Também usa canal único para evitar subscriptions reaproveitadas
 * após subscribe().
 */
export function subscribeStoreStatus(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) {
    return noop;
  }

  const client = supabase;

  const channel = client
    .channel(uniqueChannelName("store-status"))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_settings",
      },
      () => {
        onChange();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        onChange();
      }
    });

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}