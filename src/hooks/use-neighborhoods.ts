import { useEffect, useState } from "react";

import {
  listActiveNeighborhoods,
  subscribe,
  type Neighborhood,
} from "@/services/neighborhoods-store";

/** Bairros ATIVOS (reativo). Usado pelo Select de bairro no checkout. */
export function useNeighborhoods(): Neighborhood[] {
  const [list, setList] = useState<Neighborhood[]>(listActiveNeighborhoods);
  useEffect(() => subscribe(() => setList(listActiveNeighborhoods())), []);
  return list;
}
