import { Instagram, Facebook, MessageCircle } from "lucide-react";

import { Container } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { siteConfig, whatsappLink } from "@/services/site-config";
import type { SocialLink } from "@/types";

const iconFor = (icon: SocialLink["icon"]) => {
  switch (icon) {
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    default:
      return MessageCircle;
  }
};

/**
 * Footer minimalista.
 * Logo + tagline, contato via WhatsApp, redes sociais e copyright.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border pb-safe" id="contato">
      <Container>
        <div className="flex flex-col gap-10 py-14 md:flex-row md:items-start md:justify-between">
          {/* Marca */}
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              {siteConfig.tagline}
            </p>
          </div>

          {/* Contato */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contato
            </span>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors duration-hover ease-brand hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <MessageCircle className="size-4" />
              {siteConfig.contact.whatsappDisplay}
            </a>
          </div>

          {/* Redes */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Redes
            </span>
            <div className="flex items-center gap-2">
              {siteConfig.social.map((s) => {
                const Icon = iconFor(s.icon);
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-hover ease-brand hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Base: copyright */}
        <div className="flex flex-col gap-1 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. Todos os direitos reservados.
          </p>
          <p>
            Feito por{" "}
            <span className="font-semibold text-foreground">AVLZ</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}
