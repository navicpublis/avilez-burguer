import type { LucideIcon } from "lucide-react";

/** Card de indicador: ícone, valor e rótulo. Só dados reais (sem comparações). */
export function StatCard({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-neutral-700">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        {hint && <span className="text-xs font-semibold text-muted-foreground">{hint}</span>}
      </div>
      <div className="font-display text-[1.7rem] font-extrabold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
