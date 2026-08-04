import { Plus, Ticket, Receipt, Package } from "lucide-react";
import { QUICK_ACTIONS } from "../admin-data";

const ICONS = [Plus, Ticket, Receipt, Package];

/** Atalhos de ações rápidas (estrutura). */
export function QuickActions({ onAction }: { onAction?: (label: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {QUICK_ACTIONS.map((label, i) => {
        const Icon = ICONS[i];
        return (
          <button
            key={label}
            type="button"
            onClick={() => onAction?.(label)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold transition-[border-color,background-color] hover:border-primary hover:bg-secondary"
          >
            <Icon className="size-[1.05rem] text-primary" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
