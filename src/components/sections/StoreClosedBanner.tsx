/** Aviso fixo no topo da landing quando a loja está fechada. */
export function StoreClosedBanner() {
  return (
    <div className="sticky top-16 z-30 w-full bg-red-600 py-3 text-center md:top-20">
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
        Loja fechada no momento
      </p>
    </div>
  );
}
