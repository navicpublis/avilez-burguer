import { Clock, Bike, MessageCircle } from "lucide-react";

import { Container, SectionHead, Reveal } from "@/components/ui";
import { useNeighborhoods } from "@/hooks";
import { siteConfig } from "@/services/site-config";

/**
 * DeliveryArea — area de entrega (fundo amarelo). Apenas visual:
 * bairros atendidos, horario, tempo medio e WhatsApp (sem acao).
 */
export function DeliveryArea() {
  const neighborhoods = useNeighborhoods();
  const facts = [
    { icon: Clock, label: "Horário", value: "Todos os dias, 18h às 23h30" },
    { icon: Bike, label: "Tempo médio", value: "35 a 45 minutos" },
    { icon: MessageCircle, label: "WhatsApp", value: siteConfig.contact.whatsappDisplay },
  ];

  return (
    <section id="entrega" className="bg-primary py-18 text-brand-ink md:py-24">
      <Container>
        <SectionHead
          eyebrow="Entrega"
          title={
            <>
              Levamos
              <br />
              até você
            </>
          }
          desc="Atendemos toda a região com entrega rápida e quentinha."
          tone="light"
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-10">
          <Reveal>
            <span className="text-[0.78rem] font-bold uppercase tracking-wider text-brand-ink/70">
              Bairros atendidos
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {neighborhoods.map((h) => (
                <span
                  key={h.id}
                  className="rounded-full border border-brand-ink bg-brand-ink/[0.08] px-3 py-1.5 text-sm font-semibold text-brand-ink"
                >
                  {h.name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm text-brand-ink/70">
              Não achou seu bairro? Chame no WhatsApp que a gente verifica.
            </p>
          </Reveal>

          <Reveal className="grid gap-3.5">
            {facts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3.5 rounded-lg border border-brand-ink/15 bg-brand-ink/[0.06] px-[1.125rem] py-4"
              >
                <Icon className="size-6 shrink-0 text-brand-ink" strokeWidth={2} />
                <div>
                  <div className="text-[0.78rem] font-bold uppercase tracking-wider text-brand-ink/70">
                    {label}
                  </div>
                  <div className="font-display text-[1.05rem] font-bold text-brand-ink">
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
