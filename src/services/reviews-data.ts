/** Avaliacoes ficticias. */
export interface Review {
  name: string;
  initials: string;
  text: string;
  stars: number;
}

export const reviews: Review[] = [
  { name: "Marina Alves", initials: "MA", stars: 5, text: "Melhor hambúrguer da Costa Verde, sem exagero. A carne na chapa é suculenta demais e a entrega foi rápida." },
  { name: "Rafael Souza", initials: "RS", stars: 5, text: "Pão brioche perfeito, cheddar cremoso e porção generosa. Já virou meu pedido de toda sexta." },
  { name: "Beatriz Lima", initials: "BL", stars: 5, text: "Atendimento impecável e o combo compensa muito. Chegou quentinho e muito bem embalado." },
];

/** Bairros atendidos. */
export const neighborhoods = [
  "Centro", "Aterrado", "Vila Santa Cecília", "Retiro",
  "Jardim Amália", "Niterói", "Santo Agostinho", "Sessenta",
];
