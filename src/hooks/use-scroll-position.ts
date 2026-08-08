import { useEffect, useState } from "react";

/**
 * Retorna `true` quando a página passou de `threshold` px do topo.
 * Usado para transformar o header transparente em sólido no scroll.
 *
 * Performance: listener passivo + requestAnimationFrame (coalesce) e só
 * atualiza o estado quando o valor REALMENTE muda (evita re-render a cada
 * pixel rolado, que causava engasgos no mobile).
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    let last = window.scrollY > threshold;
    setScrolled(last); // estado inicial correto (ex.: recarregar já rolado)

    const update = () => {
      ticking = false;
      const next = window.scrollY > threshold;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
