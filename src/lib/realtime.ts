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
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "order_status_history",
      },
      () => onChange()
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
      () => onChange()
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
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "products",
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "addon_groups",
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "addons",
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "product_addon_groups",
      },
      () => onChange()
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

export function subscribeZones(onChange: () => void): Unsub {
  if (!isSupabaseConfigured || !supabase) {
    return noop;
  }

  const client = supabase;

  const channel = client
    .channel(uniqueChannelName("zones"))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_zones",
      },
      () => onChange()
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