/**
 * realtime.ts — camada única de Realtime do Supabase.
 *
 * Centraliza todas as subscriptions.
 * Cada função devolve um unsubscribe para cleanup no unmount.
 */

import { supabase, isSupabaseConfigured } from "./supabase";

type Unsub = () => void;

const noop: Unsub = () => {};

/**
 * Gera um nome único para canais que NÃO precisam compartilhar
 * exatamente o mesmo tópico.
 *
 * Isso evita colisões quando React monta/desmonta componentes,
 * especialmente em StrictMode e durante troca de telas.
 */
function uniqueChannelName(prefix: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}:${id}`;
}

/**
 * Acompanhamento público de pedido.
 *
 * ESTE canal precisa manter exatamente order:<publicToken>,
 * pois o Broadcast usa esse tópico para identificar o pedido.
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
 * Admin:
 * novos pedidos e alterações de status/cancelamento em tempo real.
 *
 * Usa nome único para evitar reutilização de um channel já subscribed.
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
 * Rebusca o estado após conectar/reconectar.
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

/**
 * Catálogo público em tempo real.
 *
 * Qualquer alteração no catálogo dispara um refetch pelo callback.
 * O canal também usa nome único para evitar colisões.
 */
export function subscribeCatalog(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) {
    return noop;
  }

  const client = supabase;

  const channel = client
    .channel(uniqueChannelName("catalog"))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "categories",
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
        table: "products",
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
        table: "addon_groups",
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
        table: "addons",
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
        table: "product_addon_groups",
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