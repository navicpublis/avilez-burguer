import { useEffect, useState } from "react";

import { getStock, subscribe, type Stock } from "@/services/stock-store";

/** Estoque (ingredientes/movimentações/receitas) que re-renderiza ao mudar. */
export function useStock(): Stock {
  const [stock, setStock] = useState<Stock>(getStock);
  useEffect(() => subscribe(() => setStock(getStock())), []);
  return stock;
}
