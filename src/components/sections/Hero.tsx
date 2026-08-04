import { Container } from "@/components/ui";
import burgerPhoto from "@/assets/burger.webp";

/**
 * Hero — primeira tela do site (campo amarelo #FDBE0A + tudo em preto).
 * Estilo campanha, mobile first: título gigante + 1 ação + foto.
 * "Ver Cardápio" rola suave até a seção do cardápio.
 */
export function Hero() {
  const goToMenu = () => {
    const el = document.getElementById("hamburgueres");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[#fdbe0a] text-brand-ink pt-16 md:pt-20"
    >
      <Container className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
        {/* Texto + ação */}
        <div className="lg:self-center">
          <h1
            id="hero-title"
            className="mt-8 max-w-[11ch] font-condensed uppercase leading-[0.88] tracking-[0.005em] text-brand-ink lg:mt-0 lg:max-w-[9ch] [transform:skewX(-4deg)] [transform-origin:left]"
            style={{ fontSize: "clamp(3.75rem, 17vw, 8.5rem)" }}
          >
            O melhor da Costa Verde.
          </h1>

          <div className="mt-8">
            <button
              type="button"
              onClick={goToMenu}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-brand-ink px-9 text-[0.95rem] font-bold uppercase tracking-wide text-[#fdbe0a] transition-colors duration-hover ease-brand hover:bg-black active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdbe0a]"
            >
              Ver Cardápio
            </button>
          </div>
        </div>

        {/* Foto do hambúrguer — protagonista na base (mobile) / direita (desktop) */}
        <div className="mt-auto w-full lg:mt-0 lg:flex lg:h-full lg:items-end lg:self-stretch">
          <img
            src={burgerPhoto}
            alt="Hambúrguer Avilez"
            width={941}
            height={822}
            className="-mx-5 block h-auto w-[calc(100%+2.5rem)] max-w-none lg:mx-0 lg:w-full lg:origin-bottom-right lg:scale-[1.15]"
          />
        </div>
      </Container>
    </section>
  );
}
