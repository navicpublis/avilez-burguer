import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";

import {
  findProduct,
  findAddon,
} from "@/services/menu-data";
import { getNeighborhood } from "@/services/neighborhoods-store";
import { validateCoupon } from "@/services/coupons-store";
import type { CustomerData } from "@/services/orders";

/** Uma linha do carrinho (produto + adicionais + observacao + quantidade). */
export interface CartItem {
  id: string;
  qty: number;
  addons: string[];
  obs: string;
}

const STORAGE_KEY = "avilez_cart";

// ---------- reducer ----------
type CartAction =
  | { type: "add"; item: CartItem }
  | { type: "setQty"; index: number; qty: number }
  | { type: "remove"; index: number }
  | { type: "clear" };

function signature(id: string, addons: string[], obs: string) {
  return id + "|" + [...addons].sort().join(",") + "|" + obs.trim();
}

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const sig = signature(action.item.id, action.item.addons, action.item.obs);
      const idx = state.findIndex(
        (i) => signature(i.id, i.addons, i.obs) === sig
      );
      if (idx >= 0) {
        const next = state.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + action.item.qty };
        return next;
      }
      return [...state, action.item];
    }
    case "setQty": {
      const next = state.slice();
      if (!next[action.index]) return state;
      if (action.qty <= 0) {
        next.splice(action.index, 1);
        return next;
      }
      next[action.index] = { ...next[action.index], qty: action.qty };
      return next;
    }
    case "remove": {
      const next = state.slice();
      next.splice(action.index, 1);
      return next;
    }
    case "clear":
      return [];
    default:
      return state;
  }
}

function loadCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// ---------- contexto ----------
interface ShopValue {
  cart: CartItem[];
  add: (id: string, qty: number, addons: string[], obs: string) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  // cálculos
  count: number;
  unitPrice: (item: CartItem) => number;
  subtotal: number;
  /** Taxa de entrega do bairro selecionado (0 enquanto não há bairro). */
  fee: number;
  /** true quando um bairro ativo foi escolhido (senão a taxa é "A calcular"). */
  feeReady: boolean;
  discount: number;
  total: number;
  /** Bairro de entrega selecionado (id do neighborhoods-store). */
  neighborhoodId: string | null;
  setNeighborhoodId: (id: string | null) => void;
  // cupom
  coupon: string | null;
  applyCoupon: (code: string) => boolean;
  // UI dos sheets
  categoriesOpen: boolean;
  openCategories: () => void;
  closeCategories: () => void;
  productId: string | null;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  // checkout
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  customer: CustomerData | null;
  saveCustomer: (data: CustomerData) => void;
}

const ShopContext = createContext<ShopValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, [], loadCart);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [neighborhoodId, setNeighborhoodId] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerData | null>(() => {
    try {
      const raw = localStorage.getItem("avilez_customer");
      return raw ? (JSON.parse(raw) as CustomerData) : null;
    } catch {
      return null;
    }
  });

  // persiste o carrinho no navegador
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const unitPrice = (item: CartItem) => {
    const p = findProduct(item.id);
    if (!p) return 0;
    const add = item.addons.reduce((s, aid) => {
      const a = findAddon(aid);
      return s + (a ? a.price : 0);
    }, 0);
    return p.price + add;
  };

  const value = useMemo<ShopValue>(() => {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = cart.reduce((s, i) => s + unitPrice(i) * i.qty, 0);
    // Taxa só existe depois que o cliente escolhe um bairro ATIVO.
    const nb = getNeighborhood(neighborhoodId);
    const feeReady = !!nb && nb.active;
    const fee = feeReady ? nb!.fee : 0;
    const c = coupon ? validateCoupon(coupon, subtotal) : null;
    const discount = c ? (c.type === "pct" ? (subtotal * c.value) / 100 : c.value) : 0;
    const total = Math.max(0, subtotal + fee - discount);

    return {
      cart,
      add: (id, qty, addons, obs) =>
        dispatch({ type: "add", item: { id, qty, addons, obs: obs.trim() } }),
      setQty: (index, qty) => dispatch({ type: "setQty", index, qty }),
      remove: (index) => dispatch({ type: "remove", index }),
      clear: () => {
        dispatch({ type: "clear" });
        setNeighborhoodId(null);
      },
      count,
      unitPrice,
      subtotal,
      fee,
      feeReady,
      discount,
      total,
      neighborhoodId,
      setNeighborhoodId,
      coupon,
      applyCoupon: (code) => {
        const sub = cart.reduce((s, i) => s + unitPrice(i) * i.qty, 0);
        const valid = validateCoupon(code, sub);
        if (valid) {
          setCoupon(valid.code.toUpperCase());
          return true;
        }
        setCoupon(null);
        return false;
      },
      categoriesOpen,
      openCategories: () => setCategoriesOpen(true),
      closeCategories: () => setCategoriesOpen(false),
      productId,
      openProduct: (id) => setProductId(id),
      closeProduct: () => setProductId(null),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      checkoutOpen,
      openCheckout: () => {
        setCartOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
      customer,
      saveCustomer: (data) => {
        setCustomer(data);
        try {
          localStorage.setItem("avilez_customer", JSON.stringify(data));
        } catch {
          /* ignore */
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, coupon, neighborhoodId, categoriesOpen, productId, cartOpen, checkoutOpen, customer]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop precisa estar dentro de <ShopProvider>");
  return ctx;
}
