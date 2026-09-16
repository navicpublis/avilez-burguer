import { formatCurrency } from "@/utils/format";
import type { ManagedOrder } from "@/services/orders-store";

/**
 * printOrder — imprime um comprovante do pedido usando SOMENTE a impressão do
 * navegador, sem biblioteca. Abre uma janela separada, escreve um HTML enxuto
 * (um único container), imprime e fecha.
 *
 * Por que janela separada: garante que só o comprovante vá para a impressora —
 * nada da página do Admin, nada duplicado/escondido. Isso evita o bug de
 * "folhas em branco infinitas" (que costuma vir de conteúdo oculto/duplicado ou
 * de @media print mal configurado na própria página).
 */
export function printOrder(order: ManagedOrder): void {
  const c = order.customer;
  const isPickup = /retirada/i.test(c.neighborhood || "");
  const created = new Date(order.createdAt);
  const data = created.toLocaleDateString("pt-BR");
  const hora = created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const enderecoLinhas = isPickup
    ? ["Retirada no local"]
    : [
        [c.street, c.number].filter(Boolean).join(", "),
        c.complement?.trim() ? c.complement.trim() : "",
        c.neighborhood || "",
        c.reference?.trim() ? `Ref.: ${c.reference.trim()}` : "",
      ].filter(Boolean);

  const pagamento =
    order.payment === "Dinheiro" && order.changeFor
      ? `Dinheiro (troco para ${formatCurrency(Number(order.changeFor))})`
      : order.payment;

  const esc = (s: string) =>
    String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));

  const itensHtml = order.items
    .map((it) => {
      const obs = it.obs?.trim() ? `<div class="obs">Obs.: ${esc(it.obs.trim())}</div>` : "";
      // adicionais reais do item (inclui "Combo (...)") com o valor adicional.
      // Se não houver preço detalhado, mostra só o nome. Sem combo, nada aparece.
      const detailed = it.addonsDetailed && it.addonsDetailed.length ? it.addonsDetailed : null;
      const addons = detailed
        ? detailed.map((a) =>
            `<div class="add"><span>+ ${esc(a.name)}</span>${a.price ? `<span class="addv">+ ${formatCurrency(a.price)}</span>` : ""}</div>`
          ).join("")
        : it.addons.map((a) => `<div class="add"><span>+ ${esc(a)}</span></div>`).join("");
      return `<tr>
        <td class="q">${it.qty}x</td>
        <td>${esc(it.name)}${obs}${addons}</td>
        <td class="v">${formatCurrency(it.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const totaisHtml = [
    `<tr><td>Subtotal</td><td class="v">${formatCurrency(order.subtotal)}</td></tr>`,
    isPickup ? "" : `<tr><td>Entrega</td><td class="v">${formatCurrency(order.fee)}</td></tr>`,
    order.discount > 0 ? `<tr><td>Desconto${order.coupon ? ` (${esc(order.coupon)})` : ""}</td><td class="v">- ${formatCurrency(order.discount)}</td></tr>` : "",
    `<tr class="tot"><td>TOTAL</td><td class="v">${formatCurrency(order.total)}</td></tr>`,
  ].join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido ${esc(order.id)}</title>
<style>
  @page { margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; font-size: 13px; width: 80mm; margin: 0 auto; padding: 4mm; }
  .brand { text-align: center; margin-bottom: 8px; }
  .brand .n { font-size: 18px; font-weight: 800; letter-spacing: .5px; }
  .brand .s { font-size: 11px; color: #555; }
  h2 { font-size: 14px; margin: 10px 0 4px; border-bottom: 1px dashed #999; padding-bottom: 3px; }
  .row { margin: 2px 0; }
  .lbl { color: #555; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 3px 0; }
  td.q { width: 34px; font-weight: 700; }
  td.v { text-align: right; white-space: nowrap; }
  .add { color: #444; font-size: 12px; margin-top: 2px; display: flex; justify-content: space-between; gap: 8px; }
  .addv { white-space: nowrap; }
  .obs { color: #444; font-size: 12px; font-style: italic; margin-top: 2px; }
  .items td { border-bottom: 1px dashed #ddd; }
  .totals { margin-top: 6px; }
  .totals .tot td { border-top: 2px solid #111; font-weight: 800; font-size: 15px; padding-top: 6px; }
  .foot { text-align: center; margin-top: 12px; font-size: 11px; color: #666; }
</style></head>
<body>
  <div class="brand">
    <div class="n">AVILEZ BURGUER</div>
    <div class="s">Comprovante de pedido</div>
  </div>

  <div class="row"><span class="lbl">Pedido:</span> <strong>${esc(order.id)}</strong></div>
  <div class="row"><span class="lbl">Data:</span> ${data} &nbsp; <span class="lbl">Hora:</span> ${hora}</div>

  <h2>Cliente</h2>
  <div class="row">${esc(c.name)}</div>
  <div class="row">${esc(c.phone)}</div>
  <h2>${isPickup ? "Retirada" : "Entrega"}</h2>
  ${enderecoLinhas.map((l) => `<div class="row">${esc(l)}</div>`).join("")}

  <h2>Itens</h2>
  <table class="items"><tbody>${itensHtml}</tbody></table>

  <table class="totals"><tbody>${totaisHtml}</tbody></table>

  <h2>Pagamento</h2>
  <div class="row">${esc(pagamento)}</div>
  ${order.notes && order.notes.trim() ? `<h2>Observações</h2><div class="row">${esc(order.notes.trim())}</div>` : ""}

  <div class="foot">Obrigado pela preferência!</div>
</body></html>`;

  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) return; // pop-up bloqueado — não faz nada (sem quebrar)
  win.document.open();
  win.document.write(html);
  win.document.close();

  // imprime após o conteúdo carregar; fecha a janela ao terminar/cancelar.
  const doPrint = () => {
    win.focus();
    win.print();
    // fecha logo após o diálogo (evita janela órfã); não afeta a impressão.
    setTimeout(() => { try { win.close(); } catch { /* ignore */ } }, 300);
  };
  if (win.document.readyState === "complete") doPrint();
  else win.onload = doPrint;
}
