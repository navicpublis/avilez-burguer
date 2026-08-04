import { Container } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { whatsappLink } from "@/services/site-config";

/**
 * NotFound — página 404 pública, no padrão da marca (preto + amarelo).
 * Usada para qualquer rota inexistente do site. Sem dependência de dados.
 */
export function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-16 text-foreground">
      <Container className="mx-auto flex max-w-lg flex-col items-center text-center">
        <Logo theme="brand" className="mb-10 h-12 w-auto" />

        <div className="font-condensed text-[6rem] uppercase leading-none tracking-tight text-primary sm:text-[8rem]">
          404
        </div>
        <h1 className="mt-2 font-condensed text-2xl uppercase tracking-tight sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi movido. Que tal
          voltar e montar seu pedido?
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 font-extrabold text-primary-foreground transition-colors hover:bg-brand-yellow-soft"
          >
            Ir ao cardápio
          </a>
          <a
            href={whatsappLink("Olá! Vim pelo site da Avilez Burguer.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 font-bold text-foreground transition-colors hover:border-primary"
          >
            Falar no WhatsApp
          </a>
        </div>
      </Container>
    </main>
  );
}
