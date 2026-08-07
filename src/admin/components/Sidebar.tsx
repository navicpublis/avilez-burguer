import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import logoWhite from "@/assets/logo-white.png";
import { NAV } from "../admin-data";

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
  onLogout: () => void;
  open: boolean;
}

/** Sidebar fixa (vira drawer no mobile). */
export function Sidebar({ active, onSelect, onLogout, open }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-card transition-transform duration-[250ms] ease-brand",
        "max-[860px]:shadow-2xl",
        open ? "translate-x-0" : "max-[860px]:-translate-x-full"
      )}
    >
      <img src={logoWhite} alt="Avilez Burguer" className="mx-6 my-5 h-12 w-auto self-start" />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="size-[1.15rem] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-left text-[0.92rem] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="size-[1.15rem]" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
