import { AppLayout } from "@/components/layout";
import { Home, OrderTrackingPage, NotFound } from "@/pages";
import { ShopProvider } from "@/store/shop-context";
import { CategoriesSheet, ProductSheet, CartSheet, CartBar } from "@/components/shop";
import { CheckoutSheet } from "@/components/checkout/CheckoutSheet";
import { AdminApp } from "@/admin/AdminApp";

/**
 * App - raiz da aplicacao (roteamento por pathname, sem router externo).
 *   /admin       -> painel administrativo
 *   /pedido/:id  -> acompanhamento do pedido (cliente)
 *   /            -> site completo (landing + loja)
 *   qualquer outra rota -> pagina 404
 */
export default function App() {
  const path = window.location.pathname;

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
