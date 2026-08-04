/**
 * Formata um valor numérico como moeda brasileira (R$).
 * Utilitário base — os produtos das próximas fases usarão isto.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
