import { AppLayout } from "@/components/layout";
import { Home, OrderTrackingPage, NotFound } from "@/pages";
import { ShopProvider } from "@/store/shop-context";
import { CategoriesSheet, ProductSheet, CartSheet, CartBar } from "@/components/shop";
import { CheckoutSheet } from "@/components/checkout/CheckoutSheet";
import { AdminApp } from "@/admin/AdminApp";
import { ResetPasswordPage } from "@/admin/ResetPasswordPage";
import { useStoreStatusSync } from "@/hooks";

/**
 * Site público (landing + loja). Isolado em um componente próprio para poder
 * usar hooks (ex.: sincronização do status da loja) sem violar as regras de
 * Hooks nos early-returns de roteamento do App.
 */
function PublicSite() {
  useStoreStatusSync(); // loja aberta/fechada em tempo real entre dispositivos
  return (
    <ShopProvider>
      <AppLayout headerTopTheme="light">
        <Home />
      </AppLayout>

      {/* Experiencia de compra + checkout */}
      <CategoriesSheet />
      <ProductSheet />
      <CartSheet />
      <CartBar />
      <CheckoutSheet />
    </ShopProvider>
  );
}

/**
 * App - raiz da aplicacao (roteamento por pathname, sem router externo).
 *   /admin       -> painel administrativo
 *   /pedido/:id  -> acompanhamento do pedido (cliente)
 *   /            -> site completo (landing + loja)
 *   qualquer outra rota -> pagina 404
 */
export default function App() {
  const path = window.location.pathname;

  // Redefinição de senha (link do e-mail) — rota pública, antes do gate do /admin.
  if (path === "/admin/reset-password") {
    return <ResetPasswordPage />;
  }

  // Painel administrativo — área independente do site público.
  if (path.startsWith("/admin")) {
    return <AdminApp />;
  }

  const match = path.match(/^\/pedido\/([^/]+)/);
  if (match) {
    return <OrderTrackingPage id={decodeURIComponent(match[1])} />;
  }

  // Rotas públicas conhecidas: apenas "/" (a landing single-page usa âncoras).
  // Qualquer outra rota que não seja /admin nem /pedido/:id cai no 404 elegante.
  if (path !== "/" && path !== "") {
    return <NotFound />;
  }

  return <PublicSite />;
}
