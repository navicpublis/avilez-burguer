import { useEffect, useState } from "react";

import {
  getCatalog,
  subscribe,
  type Catalog,
} from "@/services/catalog-store";

/** Catálogo (produtos/categorias/grupos) que re-renderiza quando algo muda. */
export function useCatalog(): Catalog {
  const [catalog, setCatalog] = useState<Catalog>(getCatalog);
  useEffect(() => subscribe(() => setCatalog(getCatalog())), []);
  return catalog;
}
