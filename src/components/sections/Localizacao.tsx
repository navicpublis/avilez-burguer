import { MapPin, Bike } from "lucide-react";

import { Container } from "@/components/ui";

/**
 * Localização — seção institucional premium (fundo preto, detalhes amarelos).
 * A loja física ainda não existe, então NÃO há mapa: apenas o aviso de que
 * o espaço está a caminho e que, por ora, o atendimento é só por delivery.
 * Ilustração discreta de localização (pin) e bastante respiro visual.
 */
export function Localizacao() {
  return (
    <section
      id="localizacao"
      aria-labelledby="localizacao-title"
      className="relative overflow-hidden bg-background py-28 md:py-40"
    >
      {/* brilho amarelo bem sutil ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-3xl"
      />

      <Container className="relative">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* Ilustração discreta de localização */}
          <div
            aria-hidden="true"
            className="relative mb-10 flex size-24 items-center justify-center"
          >
            <span className="absolute inset-0 rounded-full border border-primary/20" />
            <span className="absolute inset-3 rounded-full border border-primary/30" />
            <MapPin className="size-9 text-primary" strokeWidth={1.75} />
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
            Localização
          </span>

          <h2
            id="localizacao-title"
            className="mt-5 font-condensed text-[2.75rem] uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl"
          >
            Em breve em
            <br />
            <span className="text-primary">Mangaratiba</span>
          </h2>

          <p className="mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Estamos preparando nosso espaço físico para receber você com a mesma
            qualidade dos nossos hambúrgueres.
          </p>

          {/* Aviso de delivery */}
          <div className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5">
            <Bike className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Por enquanto, atendemos exclusivamente por Delivery
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
