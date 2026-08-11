/**
 * auth.ts — autenticação do painel via Supabase Auth.
 *
 * Sem segredos no frontend: nenhuma senha/e-mail hardcoded. O acesso ao painel
 * exige (1) sessão válida do Supabase Auth E (2) um perfil em admin_profiles
 * com active = true. Tudo protegido por isSupabaseConfigured — sem backend, o
 * AdminApp cai no modo de desenvolvimento local (sem senha, só para testes).
 */
import { supabase, isSupabaseConfigured } from "./supabase";

export interface AdminProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  active: boolean;
}

/** Sessão atual (ou null). Usada na recuperação de sessão ao recarregar. */
export async function getCurrentSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Perfil admin do usuário logado; null se não houver sessão ou perfil. */
export async function fetchAdminProfile(): Promise<AdminProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return null;
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("id", u.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminProfile;
}

/** true se há sessão E perfil admin ativo (regra de acesso ao painel). */
export async function isActiveAdmin(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  const profile = await fetchAdminProfile();
  return Boolean(profile?.active);
}

/** Login por e-mail/senha (Supabase Auth). */
export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "supabase-off" };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: error.message };
  // valida perfil admin ativo — se não for admin, derruba a sessão
  const profile = await fetchAdminProfile();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { ok: false, error: "not-admin" };
  }
  return { ok: true };
}

/** Logout real. */
export async function signOutAdmin(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

/** Envia e-mail de recuperação de senha (link vai para /admin/reset-password). */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured || !supabase || !email.trim()) return { ok: false };
  const redirectTo =
    typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/admin/reset-password`
      : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return { ok: !error };
}

/** Define uma nova senha para a sessão de recuperação em vigor. */
export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: "indisponível" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Há uma sessão ativa? (usado para validar o link de recuperação). */
export async function hasActiveSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/** Assina mudanças de autenticação (login/logout/refresh). */
export function onAuthChange(cb: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => {
    try {
      data.subscription.unsubscribe();
    } catch {
      /* ignore */
    }
  };
}

/**
 * Assina o evento de recuperação de senha. O Supabase, ao abrir o link do
 * e-mail, dispara PASSWORD_RECOVERY e estabelece uma sessão temporária de
 * recuperação. Chama onRecovery(true) quando isso acontece. Faz cleanup.
 */
export function onPasswordRecovery(onRecovery: (active: boolean) => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event: string) => {
    if (event === "PASSWORD_RECOVERY") onRecovery(true);
  });
  return () => {
    try {
      data.subscription.unsubscribe();
    } catch {
      /* ignore */
    }
  };
}
