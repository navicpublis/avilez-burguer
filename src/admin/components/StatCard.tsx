import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stat } from "../admin-data";

/** Card de indicador: ícone, valor e comparação com ontem (estrutura). */
export function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-neutral-700">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        {stat.trend === "up" ? (
          <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-400">
            <ArrowUp className="size-3.5" />
            {stat.delta} vs ontem
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{stat.delta}</span>
        )}
      </div>
      <div className={cn("font-display text-[1.7rem] font-extrabold leading-none tracking-tight")}>{stat.value}</div>
      <div className="mt-1.5 text-sm text-muted-foreground">{stat.label}</div>
    </div>
  );
}
