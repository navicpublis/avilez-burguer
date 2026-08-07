import { useMemo } from "react";
import { AlertTriangle, Package, ShoppingCart, X } from "lucide-react";

import { useStock, useCatalog, useOrders } from "@/hooks";
import { stockNotifications } from "@/services/stock-store";

interface Notif {
  id: string;
  icon: typeof Package;
  text: string;
  tone: string;
}

/** Lista de notificações — só eventos REAIS gerados localmente. */
export function NotificationsList() {
  useStock();
  const catalog = useCatalog();
  const orders = useOrders();

  const notifs = useMemo<Notif[]>(() => {
    const out: Notif[] = [];

    // estoque abaixo do mínimo / zerado
    stockNotifications().forEach((n) =>
      out.push({
        id: `stock-${n.id}`,
        icon: AlertTriangle,
        text: n.text,
        tone: n.level === "zerado" ? "text-red-400" : "text-orange-400",
      })
    );

    // produtos indisponíveis / em falta
    catalog.products
      .filter((p) => p.status === "indisponivel" || p.status === "em_falta")
      .forEach((p) =>
        out.push({ id: `prod-${p.id}`, icon: Package, text: `${p.name} está indisponível`, tone: "text-orange-400" })
      );

    // pedidos recebidos e cancelados nas últimas 24h
    const dayAgo = Date.now() - 86400000;
    orders
      .filter((o) => new Date(o.createdAt).getTime() >= dayAgo)
      .slice(0, 8)
      .forEach((o) => {
        if (o.status === "cancelado") {
          out.push({ id: `ord-${o.id}`, icon: X, text: `Pedido #${o.id} cancelado`, tone: "text-red-400" });
        } else if (o.status === "recebido") {
          out.push({ id: `ord-${o.id}`, icon: ShoppingCart, text: `Novo pedido #${o.id}`, tone: "text-primary" });
        }
      });

    return out;
  }, [catalog.products, orders]);

  if (notifs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Você não possui novas notificações.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {notifs.map((n) => {
        const Icon = n.icon;
        return (
          <div key={n.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary">
            <Icon className={`size-4 shrink-0 ${n.tone}`} />
            <span className="text-sm text-foreground">{n.text}</span>
          </div>
        );
      })}
    </div>
  );
}
