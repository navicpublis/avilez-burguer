import { createClient } from "@supabase/supabase-js";

/**
 * Cliente único do Supabase para todo o app (site + painel).
 *
 * As credenciais vêm EXCLUSIVAMENTE de variáveis de ambiente (Vite):
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 * Preencha-as em um arquivo ".env" na raiz (veja .env.example) e também
 * no projeto da Vercel. NUNCA colocar a chave service_role aqui.
 *
 * Enquanto as variáveis não estão configuradas, `supabase` é null e
 * `isSupabaseConfigured` é false — assim a UI pode tratar o estado
 * "backend ainda não configurado" sem quebrar (usado a partir do Bloco 2).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * MODO EMERGÊNCIA (VITE_EMERGENCY_MODE=true).
 * Quando ligado, o FLUXO DO CLIENTE (cardápio→carrinho→checkout→WhatsApp) para
 * de depender da Supabase: usa os dados locais que já existem no projeto (seed
 * do catálogo e das zonas) e finaliza direto no WhatsApp, sem chamar RPCs.
 * O Admin (login/pedidos/estoque/relatórios) segue usando a Supabase normalmente
 * — este flag NÃO altera isSupabaseConfigured. Desligue com VITE_EMERGENCY_MODE=false.
 */
export const emergencyMode =
  String(import.meta.env.VITE_EMERGENCY_MODE ?? "").toLowerCase() === "true";

/** O fluxo do CLIENTE deve usar o backend? (não, em modo emergência). */
export const clientUsesBackend = isSupabaseConfigured && !emergencyMode;

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Garante um cliente configurado ou lança erro claro (uso nos repositórios). */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env (veja SUPABASE-SETUP.md)."
    );
  }
  return supabase;
}
