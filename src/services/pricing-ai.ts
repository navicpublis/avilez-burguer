/**
 * pricing-ai.ts — camada de ANÁLISE (Fase 3), read-only.
 *
 * Princípios de segurança (obrigatórios):
 *  • A IA NUNCA calcula. O sistema calcula custo/lucro/margem/markup/preço
 *    recomendado (pricing.ts) e passa esses números prontos. A IA só interpreta.
 *  • NENHUMA chave de IA no frontend. Aqui não há OPENAI/ANTHROPIC key, nem em
 *    VITE_, nem em localStorage, nem em lugar nenhum do bundle.
 *  • A análise é somente leitura: não altera preços, produtos, estoque, pedidos,
 *    margens nem banco. Só devolve texto.
 *
 * Dois modos:
 *  1) LOCAL (padrão, sempre disponível, sem IA e sem rede): interpreta os números
 *     já calculados e monta um resumo curto e útil em português. É determinístico.
 *  2) IA REAL (opcional, desligada por padrão): se — e somente se — existir um
 *     endpoint server-side seguro configurado em VITE_PRICING_AI_URL, enviamos o
 *     RESUMO ESTRUTURADO (números, não a chave) para esse endpoint, que é quem
 *     fala com o provedor de IA usando a chave guardada no servidor (ex.: Supabase
 *     Edge Function). VITE_PRICING_AI_URL é uma URL pública de função, não um
 *     segredo. Se a variável não existir, a IA real fica inativa.
 */
import type { CostItem, PricingResult, PricingStatus } from "@/services/pricing";
import { costOfItem, STATUS_LABEL } from "@/services/pricing";
import { formatCurrency } from "@/utils/format";

/** Resumo estruturado que descreve a situação — a IA recebe isto, não recalcula. */
export interface PricingAnalysisInput {
  productName: string;
  result: PricingResult;
  status: PricingStatus;
  minMargin: number;
  targetMargin: number;
  items: { label: string; cost: number }[];
}

/** A URL do endpoint server-side (NÃO é uma chave). Vazia = IA real desativada. */
export function aiEndpoint(): string | null {
  try {
    const url = (import.meta as any).env?.VITE_PRICING_AI_URL;
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

export function aiEnabled(): boolean {
  return aiEndpoint() !== null;
}

/** Monta o resumo estruturado a partir dos números JÁ calculados pelo sistema. */
export function buildAnalysisInput(
  productName: string,
  items: CostItem[],
  result: PricingResult,
  status: PricingStatus,
  minMargin: number,
  targetMargin: number
): PricingAnalysisInput {
  return {
    productName,
    result,
    status,
    minMargin,
    targetMargin,
    items: items
      .filter((it) => it.label.trim() || costOfItem(it) > 0)
      .map((it) => ({ label: it.label.trim() || "Item", cost: costOfItem(it) })),
  };
}

/** Item de maior peso no custo (para a IA/local citar "o maior peso é a carne"). */
function heaviestCost(input: PricingAnalysisInput): { label: string; cost: number; share: number } | null {
  if (!input.items.length || input.result.cost <= 0) return null;
  const top = [...input.items].sort((a, b) => b.cost - a.cost)[0];
  return { label: top.label, cost: top.cost, share: (top.cost / input.result.cost) * 100 };
}

/**
 * ANÁLISE LOCAL (sem IA, sem chave, sem rede). Interpreta os números e devolve
 * frases curtas e úteis. Determinística — a mesma entrada dá a mesma resposta.
 */
export function localAnalysis(input: PricingAnalysisInput): string[] {
  const { result: r, status, minMargin, targetMargin } = input;
  const lines: string[] = [];

  if (r.sale <= 0 || r.cost <= 0) {
    lines.push("Faltam dados para analisar: informe os custos e um preço de venda para ver a leitura completa.");
    return lines;
  }

  // 1) leitura da situação
  if (status === "prejuizo") {
    lines.push(`Este produto está no prejuízo: a venda de ${formatCurrency(r.sale)} não cobre o custo de ${formatCurrency(r.cost)} (perda de ${formatCurrency(Math.abs(r.profit))} por unidade).`);
  } else if (status === "baixa") {
    lines.push(`A margem está em ${r.marginPct.toFixed(1)}%, abaixo da sua margem mínima de ${minMargin}%.`);
  } else if (status === "atencao") {
    lines.push(`A margem está em ${r.marginPct.toFixed(1)}% — acima do mínimo, mas ainda abaixo da meta de ${targetMargin}%.`);
  } else {
    lines.push(`Situação saudável: margem de ${r.marginPct.toFixed(1)}%, na sua meta de ${targetMargin}% ou acima.`);
  }

  // 2) maior peso no custo
  const top = heaviestCost(input);
  if (top && top.share >= 25) {
    lines.push(`O maior peso no custo é ${top.label.toLowerCase()} (${formatCurrency(top.cost)}, ${top.share.toFixed(0)}% do custo total).`);
  }

  // 3) recomendação de preço (usa o número JÁ calculado pelo sistema)
  if (status !== "saudavel" && r.recommended > 0) {
    lines.push(`Para atingir sua meta de ${targetMargin}%, o preço calculado seria ${formatCurrency(r.recommended)}.`);
  } else if (status === "saudavel") {
    lines.push(`Markup atual de ${r.markup.toFixed(2)}x. Preço recomendado para a meta: ${formatCurrency(r.recommended)}.`);
  }

  return lines;
}

/**
 * ANÁLISE POR IA (opcional). Só roda se aiEndpoint() existir. Envia o resumo
 * (números, nunca chave) ao endpoint server-side, que responde com o texto.
 * Se não houver endpoint ou der erro, retorna null (a UI usa a análise local).
 */
export async function aiAnalysis(input: PricingAnalysisInput): Promise<string[] | null> {
  const url = aiEndpoint();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: input }), // só o resumo estruturado
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.lines)) return data.lines.filter((x: unknown) => typeof x === "string");
    if (typeof data?.text === "string") return data.text.split("\n").filter(Boolean);
    return null;
  } catch {
    return null;
  }
}

// util reexportado para a UI (rótulo do status)
export { STATUS_LABEL };
