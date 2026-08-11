import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { updatePassword, hasActiveSession, onPasswordRecovery } from "@/lib/auth";

/**
 * ResetPasswordPage — rota pública /admin/reset-password.
 *
 * Recebe a sessão de recuperação que o Supabase estabelece ao abrir o link do
 * e-mail (evento PASSWORD_RECOVERY). Permite definir uma nova senha e volta ao
 * /admin. Se não houver sessão de recuperação (link expirado/inválido), mostra
 * uma tela amigável com opção de solicitar novo link. Mesmo visual do Admin.
 */
export function ResetPasswordPage() {
  // "checking" enquanto valida se há sessão de recuperação; depois "form" ou "invalid".
  const [phase, setPhase] = useState<"checking" | "form" | "invalid" | "done">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) { setPhase("invalid"); return; }
    let alive = true;

    // O evento PASSWORD_RECOVERY chega logo após o carregamento vindo do link.
    const unsub = onPasswordRecovery(() => { if (alive) setPhase("form"); });

    // Também checa diretamente: se já há sessão (recovery), libera o formulário.
    // Damos um pequeno prazo para o SDK processar o token da URL.
    const t = setTimeout(() => {
      void hasActiveSession().then((ok) => {
        if (alive) setPhase((p) => (p === "checking" ? (ok ? "form" : "invalid") : p));
      });
    }, 1200);

    return () => { alive = false; clearTimeout(t); unsub(); };
  }, []);

  async function submit() {
    if (saving) return;
    setError(null);
    if (pw.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (pw !== pw2) { setError("As senhas não coincidem."); return; }

    setSaving(true);
    const r = await updatePassword(pw);
    setSaving(false);
    if (r.ok) {
      setPhase("done");
      setTimeout(() => { window.location.href = "/admin"; }, 1500);
    } else {
      setError("Não foi possível alterar a senha. O link pode ter expirado — solicite um novo.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <h1 className="text-center font-display text-xl font-bold">Redefinir senha</h1>

        {phase === "checking" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">Validando o link…</p>
        )}

        {phase === "invalid" && (
          <>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Este link de recuperação expirou ou é inválido.
            </p>
            <a href="/admin" className="mt-6 flex h-12 items-center justify-center rounded-lg bg-primary font-extrabold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-brand-yellow-soft">
              Solicitar novo link
            </a>
          </>
        )}

        {phase === "done" && (
          <p className="mt-6 text-center text-sm font-semibold text-primary">
            Senha alterada com sucesso.
          </p>
        )}

        {phase === "form" && (
          <div className="mt-6">
            <label className="mb-1.5 block text-[0.8rem] font-semibold">Nova senha</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
              className="mb-4 h-12 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.95rem] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <label className="mb-1.5 block text-[0.8rem] font-semibold">Confirmar nova senha</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="mb-2 h-12 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.95rem] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="mt-2 h-12 w-full rounded-lg bg-primary font-extrabold uppercase tracking-wide text-primary-foreground transition-[background-color,transform] hover:bg-brand-yellow-soft active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? "Alterando…" : "Alterar senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
