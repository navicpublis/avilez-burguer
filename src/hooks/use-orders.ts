import { useEffect, useState } from "react";

import {
  listOrders,
  getOrder,
  subscribe,
  type ManagedOrder,
} from "@/services/orders-store";

/** Lista de pedidos que re-renderiza sozinha quando algo muda (tempo real). */
export function useOrders(): ManagedOrder[] {
  const [orders, setOrders] = useState<ManagedOrder[]>(listOrders);
  useEffect(() => subscribe(() => setOrders(listOrders())), []);
  return orders;
}

/** Um pedido específico, atualizado em tempo real. */
export function useOrder(id: string): ManagedOrder | null {
  const [order, setOrder] = useState<ManagedOrder | null>(() => getOrder(id));
  useEffect(() => subscribe(() => setOrder(getOrder(id))), [id]);
  return order;
}
