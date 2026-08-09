import { useState } from "react";
import logoWhite from "@/assets/logo-white.png";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signIn, requestPasswordReset } from "@/lib/auth";

/**
 * LoginPage — login do painel via Supabase Auth (sem credenciais no frontend).
 * Campos: e-mail, senha, lembrar acesso, entrar, esqueci minha senha.
 * Sem Supabase configurado → modo de desenvolvimento local (entra direto).
 */
export function LoginPage({ onEnter }: { onEnter: (remember: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Modo desenvolvimento (sem backend): entra sem senha, só para testes locais.
    if (!isSupabaseConfigured) {
      onEnter(remember);
      return;
    }

    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.ok) {
      onEnter(remember);
    } else if (res.error === "not-admin") {
      setError("Este usuário não tem acesso ao painel.");
    } else {
      setError("E-mail ou senha incorretos.");
    }
  }

  async function forgotPassword(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured) {
      setNotice("Recuperação de senha disponível com o Supabase configurado.");
      return;
    }
    if (!email.trim()) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }
    await requestPasswordReset(email);
    setNotice("Se este e-mail tiver acesso, enviamos um link para redefinir a senha.");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#171717_0%,#0b0b0b_60%)] p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        <img src={logoWhite} alt="Avilez Burguer" className="mx-auto mb-5 h-[3.25rem] w-auto" />
        <h1 className="text-center font-display text-xl font-bold">Painel Administrativo</h1>
        <p className="mb-6 mt-1 text-center text-sm text-muted-foreground">
          Avilez Burguer — acesso restrito
        </p>

        <label className="mb-1.5 block text-sm font-semibold">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@avilezburguer.com"
          autoComplete="email"
          className="mb-4 h-12 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.95rem] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <label className="mb-1.5 block text-sm font-semibold">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="mb-2 h-12 w-full rounded-lg border border-border bg-secondary px-3.5 text-[0.95rem] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {notice && <p className="mb-3 text-sm text-emerald-400">{notice}</p>}

        <div className="mb-5 mt-3 flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-primary"
            />
            Lembrar acesso
          </label>
          <a href="#" className="text-primary hover:underline" onClick={forgotPassword}>
            Esqueci minha senha
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-primary font-extrabold text-primary-foreground transition-[background-color,transform] hover:bg-brand-yellow-soft active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
