import { cn } from "@/lib/utils";
import { NOTIFS } from "../admin-data";

const TONE: Record<string, string> = {
  yellow: "text-primary", blue: "text-sky-400", red: "text-red-400",
};

/** Lista de notificações / atividade (estrutura). */
export function NotificationsList() {
  return (
    <div className="flex flex-col">
      {NOTIFS.map((n, i) => {
        const Icon = n.icon;
        return (
          <div key={i} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary", TONE[n.tone])}>
              <Icon className="size-[1.1rem]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{n.title}</div>
              <div className="truncate text-[0.78rem] text-muted-foreground">{n.sub}</div>
            </div>
            <span className="shrink-0 text-[0.72rem] text-muted-foreground">{n.time}</span>
          </div>
        );
      })}
    </div>
  );
}
