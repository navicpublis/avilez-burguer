import card1 from "@/assets/card-burger-1.webp";
import card2 from "@/assets/card-burger-2.webp";
import card3 from "@/assets/card-burger-3.webp";
import card4 from "@/assets/card-burger-4.webp";

export type Category = "hamburgueres" | "combos" | "bebidas" | "sobremesas";

/**
 * Produto do cardapio. Precos sao numeros (formatados com formatCurrency).
 * Cada item tem id, ingredients, available e hasAddons.
 */
export interface Product {
  id: string;
  cat: Category;
  name: string;
  desc: string;
  ingredients: string[];
  price: number;
  oldPrice?: number;
  image?: string;
  badge?: string;
  available: boolean;
  /** Aceita adicionais (hamburgueres/combos). Bebidas/sobremesas: false. */
  hasAddons: boolean;
}

/** Adicional que soma ao preco do produto. */
export interface Addon {
  id: string;
  name: string;
  price: number;
}

export const ADDONS: Addon[] = [
  { id: "bacon", name: "Bacon", price: 6.0 },
  { id: "cheddar", name: "Cheddar extra", price: 5.0 },
  { id: "onion", name: "Onion Rings", price: 8.0 },
  { id: "molho", name: "Molho Especial", price: 3.0 },
];

/** Sugestoes rapidas para o campo de observacoes. */
export const OBS_SUGGESTIONS = ["Sem cebola", "Pouco molho", "Bem passado", "Sem picles"];

/** Taxa de entrega (estrutura — sera dinamica por bairro no futuro). */
export const DELIVERY_FEE = 6.0;

/** Cupons (estrutura). */
export const COUPONS: Record<string, { type: "pct"; value: number; label: string }> = {
  AVILEZ10: { type: "pct", value: 10, label: "10% de desconto" },
};

export const burgers: Product[] = [
  { id: "classico", cat: "hamburgueres", name: "Avilez Clássico", desc: "Blend 160g na chapa, cheddar, alface, tomate e maionese da casa no pão brioche.", ingredients: ["Pão brioche", "Blend bovino 160g", "Cheddar", "Alface", "Tomate", "Maionese da casa"], price: 27.9, image: card1, badge: "Mais pedido", available: true, hasAddons: true },
  { id: "duplo", cat: "hamburgueres", name: "Duplo Cheddar", desc: "Dois blends na chapa, cheddar duplo cremoso e cebola caramelizada.", ingredients: ["Pão brioche", "2x Blend bovino 160g", "Cheddar duplo", "Cebola caramelizada"], price: 34.9, image: card2, badge: "Muito queijo", available: true, hasAddons: true },
  { id: "salada", cat: "hamburgueres", name: "Salada da Casa", desc: "Blend na chapa, alface americana, tomate, cebola roxa e picles.", ingredients: ["Pão brioche", "Blend bovino 160g", "Alface americana", "Tomate", "Cebola roxa", "Picles"], price: 29.9, image: card4, available: true, hasAddons: true },
  { id: "bacon", cat: "hamburgueres", name: "Bacon Supremo", desc: "Blend na chapa, bacon crocante, cheddar e molho barbecue da casa.", ingredients: ["Pão brioche", "Blend bovino 160g", "Bacon crocante", "Cheddar", "Molho barbecue da casa"], price: 36.9, image: card3, badge: "Novo", available: true, hasAddons: true },
];

export const combos: Product[] = [
  { id: "combo-classico", cat: "combos", name: "Combo Clássico", desc: "Avilez Clássico + batata rústica + refrigerante lata.", ingredients: ["Avilez Clássico", "Batata rústica", "Refrigerante lata 350ml"], price: 39.9, oldPrice: 49.8, image: card1, badge: "Economize", available: true, hasAddons: true },
  { id: "combo-duplo", cat: "combos", name: "Combo Duplo", desc: "Duplo Cheddar + batata + refrigerante. Perfeito pra fome grande.", ingredients: ["Duplo Cheddar", "Batata rústica", "Refrigerante lata 350ml"], price: 46.9, oldPrice: 57.8, image: card2, badge: "Economize", available: true, hasAddons: true },
  { id: "combo-dois", cat: "combos", name: "Combo a Dois", desc: "2 hambúrgueres + 2 batatas + 2 bebidas. Ideal pra dividir.", ingredients: ["2 Hambúrgueres", "2 Batatas rústicas", "2 Bebidas"], price: 84.9, oldPrice: 99.6, image: card3, badge: "Economize", available: true, hasAddons: true },
];

export const drinks: Product[] = [
  { id: "refri", cat: "bebidas", name: "Refrigerante Lata", desc: "Coca-Cola, Guaraná ou Fanta • 350ml", ingredients: ["Lata 350ml, gelada"], price: 6.9, available: true, hasAddons: false },
  { id: "suco", cat: "bebidas", name: "Suco Natural", desc: "Laranja, maracujá ou limão • 400ml", ingredients: ["Fruta natural", "400ml"], price: 9.9, available: true, hasAddons: false },
  { id: "agua", cat: "bebidas", name: "Água Mineral", desc: "Com ou sem gás • 500ml", ingredients: ["500ml"], price: 4.9, available: true, hasAddons: false },
  { id: "cerveja", cat: "bebidas", name: "Cerveja Long Neck", desc: "Gelada • 355ml", ingredients: ["Long neck 355ml"], price: 10.9, available: false, hasAddons: false },
];

export const desserts: Product[] = [
  { id: "brownie", cat: "sobremesas", name: "Brownie na Chapa", desc: "Brownie quente com sorvete de creme e calda.", ingredients: ["Brownie", "Sorvete de creme", "Calda"], price: 18.9, available: true, hasAddons: false },
  { id: "milkshake", cat: "sobremesas", name: "Milkshake", desc: "Chocolate, morango ou ovomaltine • 400ml", ingredients: ["400ml", "Sabor à escolha"], price: 16.9, available: true, hasAddons: false },
  { id: "petit", cat: "sobremesas", name: "Petit Gâteau", desc: "Bolo quente de chocolate com sorvete.", ingredients: ["Bolo de chocolate", "Sorvete"], price: 19.9, available: true, hasAddons: false },
];

/** Todos os produtos, para lookup por id. */
export const allProducts: Product[] = [...burgers, ...combos, ...drinks, ...desserts];
export function findProduct(id: string): Product | undefined {
  return allProducts.find((p) => p.id === id);
}
export function findAddon(id: string): Addon | undefined {
  return ADDONS.find((a) => a.id === id);
}
