// ════════════════════════════════════════════════════════════════
// AVILEZ BURGUER — Supabase Edge Function: pricing-analysis  (EXEMPLO)
//
// Este arquivo é a base para ATIVAR a análise por IA com segurança.
// Ele roda NO SERVIDOR (Supabase Edge / Deno) — NUNCA no navegador.
// A chave da IA fica como SECRET do servidor, jamais no frontend/bundle/Git.
//
// >>> A IA É SOMENTE LEITURA E NÃO CALCULA. <<<
// O frontend (pricing.ts) já calculou custo/lucro/margem/markup/recomendado
// e envia esse RESUMO pronto. Aqui a IA apenas interpreta em texto curto.
// Esta função não acessa o banco, não altera preços, produtos, estoque nem
// pedidos — só recebe números e devolve frases.
//
// ── COMO ATIVAR (quando você quiser) ────────────────────────────
// 1. Instale a CLI do Supabase e faça login.
// 2. Guarde a chave da IA como secret NO SERVIDOR (nunca no .env do front):
//      supabase secrets set OPENAI_API_KEY=sk-...        (ou ANTHROPIC_API_KEY)
// 3. Publique a função:
//      supabase functions deploy pricing-analysis
// 4. Pegue a URL pública da função (algo como
//      https://<PROJECT>.functions.supabase.co/pricing-analysis )
//    e coloque no .env do FRONT como VITE_PRICING_AI_URL=<essa URL>.
//    ⚠️ VITE_PRICING_AI_URL é uma URL de endpoint — NÃO é a chave. A chave
//       continua só no servidor (passo 2). Sem essa variável, o app usa a
//       análise local (sem IA) e nada quebra.
//
// Enquanto os passos acima não forem feitos, a IA fica PREPARADA e INATIVA.
// ════════════════════════════════════════════════════════════════

// @ts-nocheck  (ambiente Deno/Edge — tipos resolvidos no deploy, não no build do front)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const a = body?.analysis;
    if (!a || typeof a !== "object") {
      return json({ error: "payload inválido" }, 400);
    }

    // A chave vem SÓ do ambiente do servidor (secret). Nunca do cliente.
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      // Sem chave no servidor → devolve vazio; o front cai na análise local.
      return json({ lines: [] }, 200);
    }

    // Prompt curto e objetivo. A IA NÃO recalcula — recebe os números prontos.
    const sys =
      "Você é um consultor de precificação de uma hamburgueria. Recebe números JÁ " +
      "calculados (custo, lucro, margem, markup, preço recomendado) e apenas os " +
      "interpreta. NÃO recalcule. Responda em português do Brasil, no máximo 3 frases " +
      "curtas e úteis, sem repetir todos os números — foque no que fazer.";

    const user =
      `Produto: ${a.productName}\n` +
      `Situação: ${a.status}\n` +
      `Custo total: R$ ${num(a.result?.cost)}\n` +
      `Preço de venda: R$ ${num(a.result?.sale)}\n` +
      `Lucro: R$ ${num(a.result?.profit)}\n` +
      `Margem: ${num(a.result?.marginPct)}% (mínima ${a.minMargin}%, meta ${a.targetMargin}%)\n` +
      `Markup: ${num(a.result?.markup)}x\n` +
      `Preço recomendado p/ meta: R$ ${num(a.result?.recommended)}\n` +
      `Itens de custo: ${(a.items || []).map((i: any) => `${i.label} R$ ${num(i.cost)}`).join(", ")}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!resp.ok) return json({ lines: [] }, 200);
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const lines = text.split("\n").map((s) => s.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
    return json({ lines }, 200);
  } catch (_e) {
    return json({ lines: [] }, 200);
  }
});

function num(v: unknown): string {
  const n = Number(v) || 0;
  return n.toFixed(2);
}
function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
