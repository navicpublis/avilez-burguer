import { useEffect, useState } from "react";

/**
 * Retorna `true` quando a página passou de `threshold` px do topo.
 * Usado para transformar o header transparente em sólido no scroll.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll(); // estado inicial correto (ex.: recarregar já rolado)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
