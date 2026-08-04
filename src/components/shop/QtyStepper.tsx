import { cn } from "@/lib/utils";

interface QtyStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  size?: "md" | "sm";
}

/** Seletor de quantidade: − valor +. Atualiza na hora. */
export function QtyStepper({ value, onChange, min = 1, size = "md" }: QtyStepperProps) {
  const btn =
    size === "sm"
      ? "size-8 text-lg"
      : "size-10 text-xl";
  const val = size === "sm" ? "min-w-6 text-base" : "min-w-8 text-lg";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
      <button
        type="button"
        aria-label="Diminuir"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={cn(
          "flex items-center justify-center rounded-full bg-background leading-none text-foreground transition-[background-color,transform] duration-press ease-brand hover:bg-accent active:scale-90 disabled:opacity-40",
          btn
        )}
      >
        −
      </button>
      <span className={cn("text-center font-display font-extrabold", val)}>{value}</span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(value + 1)}
        className={cn(
          "flex items-center justify-center rounded-full bg-background leading-none text-foreground transition-[background-color,transform] duration-press ease-brand hover:bg-accent active:scale-90",
          btn
        )}
      >
        +
      </button>
    </div>
  );
}
