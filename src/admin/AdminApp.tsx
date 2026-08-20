import { useEffect, useState } from "react";

import { LoginPage } from "./LoginPage";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardHome } from "./pages/DashboardHome";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StockPage } from "./pages/StockPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { CouponsPage } from "./pages/CouponsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { initStockAutoConsume } from "@/services/stock-store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isActiveAdmin, signOutAdmin, onAuthChange } from "@/lib/auth";

const REMEMBER_KEY = "avilez_admin_remember";

/**
 * AdminApp — raiz do painel administrativo (independente do site público).
 *
 * Acesso (com Supabase configurado): exige sessão válida do Supabase Auth E
 * perfil admin ativo (admin_profiles.active). A sessão é recuperada ao
 * recarregar e mudanças de auth são assinadas. Sem Supabase configurado, cai
 * no modo de desenvolvimento local (gate simples via localStorage, sem senha).
 */
export function AdminApp() {
  const [authed, setAuthed] = useState<boolean>(() => {
    if (isSupabaseConfigured) return false; // decidido após checar a sessão
    try {
      return localStorage.getItem(REMEMBER_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [checking, setChecking] = useState<boolean>(isSupabaseConfigured);
  const [active, setActive] = useState<string>(() => {
    // lembra a última seção aberta (persiste após F5)
    try { return localStorage.getItem("avilez_admin_tab") || "dashboard"; } catch { return "dashboard"; }
  });
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // grava a seção ativa para sobreviver ao F5
  useEffect(() => {
    try { localStorage.setItem("avilez_admin_tab", active); } catch { /* ignore */ }
  }, [active]);

  // Recuperação de sessão + escuta de mudanças de autenticação (Supabase).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let alive = true;
    const check = () => {
      isActiveAdmin().then((ok) => {
        if (!alive) return;
        setAuthed(ok);
        setChecking(false);
      });
    };
    check();
    const unsub = onAuthChange(check);
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  // inicia o consumo automático de estoque ao confirmar pedidos (só no modo
  // local; com Supabase, a baixa é feita pela RPC no banco — sem duplicar).
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const stopStock = initStockAutoConsume();
    return stopStock;
  }, []);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginPage
        onEnter={(remember) => {
          if (!isSupabaseConfigured) {
            try {
              if (remember) localStorage.setItem(REMEMBER_KEY, "1");
            } catch {
              /* ignore */
            }
            setAuthed(true);
          }
          // com Supabase: onAuthChange já dispara o check e libera o painel
        }}
      />
    );
  }

  function logout() {
    if (isSupabaseConfigured) {
      void signOutAdmin();
      setAuthed(false);
      return;
    }
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
        onSelect={(key) => {
          setActive(key);
          setDrawer(false);
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
        {active === "dashboard" && <DashboardHome notify={notify} onNavigate={setActive} />}
        {active === "pedidos" && <OrdersPage />}
        {active === "produtos" && <ProductsPage />}
        {active === "estoque" && <StockPage />}
        {active === "categorias" && <CategoriesPage />}
        {active === "clientes" && <ClientsPage />}
        {active === "avaliacoes" && <ReviewsPage />}
        {active === "cupons" && <CouponsPage />}
        {active === "relatorios" && <ReportsPage />}
        {active === "anotacoes" && <NotesPage />}
        {active === "configuracoes" && <SettingsPage />}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
