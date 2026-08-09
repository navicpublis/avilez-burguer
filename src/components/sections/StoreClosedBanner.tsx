/**
 * Faixa de loja fechada — fica no FLUXO NORMAL da página (entre o header e a
 * Hero), nunca sobreposta. Sem position fixed/absolute.
 */
export function StoreClosedBanner() {
  return (
    <div className="w-full bg-red-600 py-3 text-center">
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
        Loja fechada no momento
      </p>
    </div>
  );
}
