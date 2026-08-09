import { useEffect, useState } from "react";

import { subscribeAdminOrders } from "@/lib/realtime";

import {
  listOrders,
  getOrder,
  subscribe,
  hydrateAdminOrders,
  type ManagedOrder,
} from "@/services/orders-store";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Lista de pedidos que re-renderiza sozinha quando algo muda (tempo real). */
export function useOrders(): ManagedOrder[] {
  const [orders, setOrders] = useState<ManagedOrder[]>(listOrders);
  useEffect(() => {
    const refresh = () => setOrders(listOrders());
    const onRealtime = () => { if (isSupabaseConfigured) void hydrateAdminOrders(); else refresh(); };
    const unsubLocal = subscribe(refresh);            // mirror local → re-render
    const unsubRealtime = subscribeAdminOrders(onRealtime); // Supabase → re-hidrata e o subscribe local re-renderiza
    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }, []);
  return orders;
}

/** Um pedido específico, atualizado em tempo real. */
export function useOrder(id: string): ManagedOrder | null {
  const [order, setOrder] = useState<ManagedOrder | null>(() => getOrder(id));
  useEffect(() => {
    const refresh = () => setOrder(getOrder(id));
    const onRealtime = () => { if (isSupabaseConfigured) void hydrateAdminOrders(); else refresh(); };
    const unsubLocal = subscribe(refresh);
    const unsubRealtime = subscribeAdminOrders(onRealtime);
    return () => {
      unsubLocal();
      unsubRealtime();
    };
  }, [id]);
  return order;
}
