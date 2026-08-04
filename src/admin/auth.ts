/**
 * Credenciais de acesso ao painel (TEMPORÁRIO).
 * Isto roda no frontend, então NÃO é segurança real — qualquer pessoa com o
 * código consegue ler. Serve só enquanto não há backend. Na fase de
 * integração (Supabase Auth), trocar por autenticação de verdade no servidor.
 */
export const ADMIN_EMAIL = "avilezburguer@gmail.com";
export const ADMIN_PASSWORD = "Rjr092325*";

export function checkCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
