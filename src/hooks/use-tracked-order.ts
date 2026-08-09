import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { subscribeOrderTracking } from "@/lib/realtime";
import { getRemoteOrderByToken } from "@/services/orders";
import { getOrder, subscribe, type ManagedOrder } from "@/services/orders-store";
import type { OrderStatus } from "@/services/order-status";

/**
 * Pedido para a tela pública de acompanhamento (/pedido/:token).
 *
 * • Supabase configurado → busca o estado atual pela RPC segura
 *   get_order_by_token AO MONTAR (nunca acessa a tabela orders direto) e
 *   ASSINA o tópico Realtime "order:<token>" (Broadcast). A cada atualização
 *   de status, rebusca — status/timeline/horários/cancelamento atualizam
 *   sozinhos, sem reload. Reconexão: como sempre rebusca o estado atual, um
 *   reconnect não deixa dado velho na tela.
 * • Sem Supabase → usa o pedido local (orders-store), reativo como antes.
 */
export function useTrackedOrder(token: string): { order: ManagedOrder | null; loading: boolean } {
  const [order, setOrder] = useState<ManagedOrder | null>(() =>
    isSupabaseConfigured ? null : getOrder(token)
  );
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    let alive = true;

    if (isSupabaseConfigured) {
      const refetch = () => {
        getRemoteOrderByToken(token).then((remote) => {
          if (!alive) return;
          setOrder(
            remote
              ? ({
                  ...remote,
                  status: remote.status as OrderStatus,
                  history: remote.history.map((h) => ({ status: h.status as OrderStatus, at: h.at })),
                } as ManagedOrder)
              : null
          );
          setLoading(false);
        });
      };
      refetch(); // 1) estado atual primeiro
      const unsub = subscribeOrderTracking(token, refetch); // 2) depois assina
      return () => {
        alive = false;
        unsub();
      };
    }

    // fallback local (reativo)
    setOrder(getOrder(token));
    const unsub = subscribe(() => setOrder(getOrder(token)));
    return () => {
      alive = false;
      unsub();
    };
  }, [token]);

  return { order, loading };
}
