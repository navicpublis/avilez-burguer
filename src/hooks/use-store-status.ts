import { useEffect } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { subscribeStoreStatus } from "@/lib/realtime";
import { hydrateSettings } from "@/services/settings-store";

/**
 * Sincroniza o status da loja (aberta/fechada) com o Supabase em tempo real.
 * Montar UMA vez na raiz pública. Comportamento:
 *  • ao montar → busca o estado atual do Supabase;
 *  • assina o Realtime de app_settings → mudança do Admin reflete sem F5;
 *  • ao reconectar/voltar a internet → rebusca o estado atual;
 *  • no unmount → remove a subscription (sem duplicar canais / sem leak).
 */
export function useStoreStatusSync(): void {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    hydrateSettings(); // estado atual ao montar
    const unsub = subscribeStoreStatus(hydrateSettings); // tempo real (+ refetch ao reconectar)
    const onOnline = () => hydrateSettings(); // voltou a internet → rebusca
    window.addEventListener("online", onOnline);
    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, []);
}
