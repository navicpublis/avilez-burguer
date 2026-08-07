import { useEffect, useState } from "react";
import { getSettings, subscribe, type Settings } from "@/services/settings-store";

/** Configurações do site/painel (reativo). */
export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(getSettings);
  useEffect(() => subscribe(() => setS(getSettings())), []);
  return s;
}
