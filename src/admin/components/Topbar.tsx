import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { NotificationsList } from "./NotificationsList";

/** Header superior: menu (mobile), pesquisa global, notificações, usuário. */
export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background/85 px-6 py-3.5 backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="text-foreground min-[861px]:hidden"
      >
        <Menu className="size-6" />
      </button>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Pesquisar pedidos, produtos, clientes..."
          className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3.5">
        <div className="relative">
          <button
            type="button"
            aria-label="Notificações"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <Bell className="size-5" />
            <span className="absolute right-2.5 top-2 size-2 rounded-full border-2 border-card bg-primary" />
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-2xl">
                <h4 className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notificações
                </h4>
                <NotificationsList />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1.5 pl-3.5 pr-1.5">
          <div className="max-[860px]:hidden">
            <div className="text-sm font-bold leading-tight">Guilherme</div>
            <div className="text-[0.72rem] text-muted-foreground">Administrador</div>
          </div>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
            GA
          </span>
        </div>
      </div>
    </header>
  );
}
