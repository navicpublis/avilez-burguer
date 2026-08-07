import { Clock } from "lucide-react";

import { Container } from "@/components/ui";
import { nextOpeningText } from "@/services/settings-store";

/** Aviso fixo no topo da landing quando a loja está fechada. */
export function StoreClosedBanner() {
  return (
    <div className="sticky top-16 z-30 border-y border-red-500/30 bg-red-500/10 backdrop-blur md:top-20">
      <Container className="flex items-center justify-center gap-2 py-2.5 text-center">
        <Clock className="size-4 shrink-0 text-red-400" />
        <p className="text-sm font-semibold text-red-300">
          Estamos fechados no momento. Funcionamento: {nextOpeningText()}.
        </p>
      </Container>
    </div>
  );
}
