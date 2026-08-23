/**
 * pricing.ts — tipos e FÓRMULAS puras do módulo de Precificação (Fase 1).
 *
 * Só cálculo, sem I/O. Não toca em preço de cardápio, pedidos nem nada externo.
 *
 * Fórmulas (conforme especificado):
 *   Lucro   = venda - custo
 *   Margem  = ((venda - custo) / venda) * 100
 *   Markup  = venda / custo
 *   Preço recomendado = custo / (1 - margemDesejada)     (margem em fração)
 *
 * Custo de um item de custo, por tipo de unidade (unidade/kg-g/litro-ml/
 * pacote/porção): usa preço e quantidade de COMPRA como referência e a
 * quantidade USADA no produto:
 *   custoDoItem = precoCompra * (qtdUsada / qtdCompra)
 * Ex.: 1 kg (1000 g) por R$30, uso 150 g → 30 * (150/1000) = R$4,50.
 */

export type PricingUnitKind = "unidade" | "peso" | "volume" | "pacote" | "porcao";

export const UNIT_KIND_LABEL: Record<PricingUnitKind, string> = {
  unidade: "Unidade",
  peso: "Peso (kg/g)",
  volume: "Volume (L/ml)",
  pacote: "Pacote",
  porcao: "Porção",
};

export interface CostItem {
  id: string;
  label: string;
  unitKind: PricingUnitKind;
  purchaseQty: number;   // quantidade da compra (ex.: 1000 g, 1 un, 1 pacote)
  purchasePrice: number; // preço da compra (ex.: R$30 pelo kg)
  usedQty: number;       // quantidade usada no produto (mesma unidade da compra)
  unitLabel: string;     // rótulo livre p/ exibição (ex.: "g", "ml", "un")
  order: number;
}

export interface PricingProfile {
  id: string;
  productId: string;
  salePrice: number | null;    // venda considerada (null = usa o preço do produto)
  minMargin: number | null;    // % (null = usa o padrão de settings)
  targetMargin: number | null; // % (null = usa o padrão de settings)
  notes: string;
  items: CostItem[];
}

export interface PricingSettings {
  defaultMinMargin: number;    // %
  defaultTargetMargin: number; // %
}

/**
 * Dinheiro/decimais em padrão BR, para inputs controlados por STRING.
 * A digitação é tratada como texto e só normalizada na hora de calcular/salvar.
 */

/** Sanitiza a digitação: só dígitos + 1 separador (vírgula OU ponto) + máx 2 casas.
 *  Mantém a string "em progresso" (ex.: "3,", "3,8", "3,80") sem apagar centavos. */
export function sanitizeMoneyInput(raw: string): string {
  let s = (raw ?? "").replace(/[^\d.,]/g, ""); // remove tudo que não é dígito/.,
  // unifica: o primeiro separador (vírgula ou ponto) é o decimal; os demais somem
  const firstSep = s.search(/[.,]/);
  if (firstSep >= 0) {
    const intPart = s.slice(0, firstSep).replace(/[.,]/g, "");
    let decPart = s.slice(firstSep + 1).replace(/[.,]/g, "");
    decPart = decPart.slice(0, 2); // no máximo 2 casas decimais
    // preserva o separador que o usuário digitou (vírgula por padrão no BR)
    const sep = s[firstSep] === "." ? "." : ",";
    s = intPart + sep + decPart;
  }
  return s;
}

/** Converte a string BR ("3,80" ou "3.80") para número. Nunca NaN. */
export function moneyToNumber(s: string): number {
  if (typeof s !== "string") return Number(s) || 0;
  const n = Number(s.replace(/\./g, ".").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Número → string BR para exibir no input (ex.: 3.8 → "3,80"; 0 → ""). */
export function numberToMoneyInput(n: number | null | undefined, withCents = true): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "";
  return withCents ? v.toFixed(2).replace(".", ",") : String(v).replace(".", ",");
}

/** Custo de um item de custo isolado. Robusto a zero/negativos. */
export function costOfItem(it: CostItem): number {
  const pq = Number(it.purchaseQty) || 0;
  const pp = Number(it.purchasePrice) || 0;
  const uq = Number(it.usedQty) || 0;
  if (pq <= 0) return 0;
  const c = pp * (uq / pq);
  return c > 0 ? c : 0;
}

/** Custo total do produto (soma dos itens). */
export function totalCost(items: CostItem[]): number {
  return items.reduce((s, it) => s + costOfItem(it), 0);
}

export interface PricingResult {
  cost: number;
  sale: number;
  profit: number;        // R$
  marginPct: number;     // %
  markup: number;        // x
  minPrice: number;      // preço p/ atingir a margem mínima
  recommended: number;   // preço p/ atingir a margem desejada
  belowMin: boolean;     // a venda atual está abaixo da margem mínima?
}

/** Preço para atingir uma margem-alvo (em %). custo / (1 - margem/100). */
export function priceForMargin(cost: number, marginPct: number): number {
  const m = Math.min(Math.max(Number(marginPct) || 0, 0), 99.9) / 100;
  if (cost <= 0) return 0;
  return cost / (1 - m);
}

/** Calcula todos os indicadores de um produto. */
export function computePricing(
  items: CostItem[],
  sale: number,
  minMargin: number,
  targetMargin: number
): PricingResult {
  const cost = totalCost(items);
  const s = Number(sale) || 0;
  const profit = s - cost;
  const marginPct = s > 0 ? ((s - cost) / s) * 100 : 0;
  const markup = cost > 0 ? s / cost : 0;
  const minPrice = priceForMargin(cost, minMargin);
  const recommended = priceForMargin(cost, targetMargin);
  return {
    cost, sale: s, profit, marginPct, markup, minPrice, recommended,
    belowMin: s > 0 && cost > 0 && marginPct < (Number(minMargin) || 0),
  };
}

/**
 * Situação financeira de um produto, com base nas metas configuráveis:
 *   prejuízo   — lucro < 0
 *   baixa      — margem abaixo da margem MÍNIMA (mas sem prejuízo)
 *   atencao    — margem entre a mínima e a desejada
 *   saudavel   — margem >= desejada
 */
export type PricingStatus = "prejuizo" | "baixa" | "atencao" | "saudavel";

export function classifyStatus(r: PricingResult, minMargin: number, targetMargin: number): PricingStatus {
  if (r.sale <= 0 || r.cost <= 0) return "atencao"; // dados incompletos → atenção neutra
  if (r.profit < 0) return "prejuizo";
  if (r.marginPct < (Number(minMargin) || 0)) return "baixa";
  if (r.marginPct < (Number(targetMargin) || 0)) return "atencao";
  return "saudavel";
}

export const STATUS_LABEL: Record<PricingStatus, string> = {
  prejuizo: "Prejuízo",
  baixa: "Margem baixa",
  atencao: "Atenção",
  saudavel: "Saudável",
};

/** Ponto de equilíbrio unitário = custo total (o preço que cobre os custos). */
export function breakEven(items: CostItem[]): number {
  return totalCost(items);
}
