import { Instagram, Facebook, MessageCircle, MapPin, Clock } from "lucide-react";

import { Container } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { useSettings } from "@/hooks";

/**
 * Footer institucional.
 * Marca + descrição, localização, horários, contato (WhatsApp/Instagram/
 * Facebook) e copyright. Dados vêm do site-config (fonte única).
 */
export function Footer() {
  const { business, hours } = useSettings();
  const waHref = `https://wa.me/${business.whatsapp}`;
  const instagramHref = "https://instagram.com/avilezburguer";
  const facebookHref = "https://facebook.com/avilezburguer";

  return (
    <footer
      id="contato"
      className="border-t border-border bg-background pb-safe"
    >
      <Container>
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Marca + descrição */}
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {business.description}
            </p>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Localização
            </h3>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="size-4 text-primary" />
              {business.city} - {business.state}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Atendimento por delivery.
            </p>
          </div>

          {/* Horários */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Horário
            </h3>
            <ul className="mt-4 space-y-2.5">
              {hours.map((h) => (
                <li key={h.days} className="text-sm">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <Clock className="size-3.5 text-primary" />
                    {h.days}
                  </span>
                  <span className="ml-6 block text-muted-foreground">
                    {h.time ?? "A definir"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contato
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-hover ease-brand hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <MessageCircle className="size-4 text-primary" />
                {business.whatsappDisplay}
              </a>
              {true && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-hover ease-brand hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <Instagram className="size-4 text-primary" />
                  {business.instagram}
                </a>
              )}
              {true && (
                <a
                  href={facebookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-hover ease-brand hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <Facebook className="size-4 text-primary" />
                  {business.facebook}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Base: copyright */}
        <div className="flex flex-col gap-1 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {business.name}. Todos os direitos reservados.</p>
          <p>
            Desenvolvido por{" "}
            <span className="font-semibold text-foreground">AVLZ</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
