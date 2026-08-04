import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card base do painel (superfície escura + borda). */
export function Card({
  title, action, preview, className, children,
}: {
  title?: string; action?: ReactNode; preview?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border border-border bg-card p-5", className)}>
      {(title || action || preview) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h3 className="font-display text-base font-bold">{title}</h3>}
          {preview && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
              Prévia
            </span>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
