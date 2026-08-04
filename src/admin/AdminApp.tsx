import { useEffect, useState } from "react";

import { LoginPage } from "./LoginPage";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardHome } from "./pages/DashboardHome";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";
import { seedIfEmpty } from "@/services/orders-store";
import { initStockAutoConsume } from "@/services/stock-store";

const REMEMBER_KEY = "avilez_admin_remember";

/**
 * AdminApp — raiz do painel administrativo (independente do site público).
 * Gate de login (estrutura) → layout com sidebar + header + conteúdo.
 * Só a Dashboard principal existe; os demais itens são de fases futuras.
 */
export function AdminApp() {
  const [authed, setAuthed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [active, setActive] = useState("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // popula pedidos de exemplo na primeira vez (só p/ demonstração)
  useEffect(() => {
    seedIfEmpty();
    const stopStock = initStockAutoConsume();
    return stopStock;
  }, []);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  if (!authed) {
    return (
      <LoginPage
        onEnter={(remember) => {
          try {
            if (remember) localStorage.setItem(REMEMBER_KEY, "1");
          } catch {
            /* ignore */
          }
          setAuthed(true);
        }}
      />
    );
  }

  function logout() {
    try {
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar
        active={active}
        open={drawer}
        onLogout={logout}
        onSelect={(key, soon) => {
          setActive(key);
          setDrawer(false);
          if (soon) notify("Essa tela chega numa próxima fase");
        }}
      />

      {/* scrim do drawer (mobile) */}
      {drawer && (
        <div
          className="fixed inset-0 z-[45] bg-black/60 min-[861px]:hidden"
          onClick={() => setDrawer(false)}
        />
      )}

      <div className="flex min-h-dvh flex-col min-[861px]:ml-[260px]">
        <Topbar onOpenMenu={() => setDrawer(true)} />
        {active === "dashboard" && <DashboardHome notify={notify} />}
        {active === "pedidos" && <OrdersPage />}
        {active === "produtos" && <ProductsPage />}
        {active === "estoque" && <StockPage />}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
