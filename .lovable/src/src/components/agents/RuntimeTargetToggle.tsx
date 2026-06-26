import { cn } from "@/lib/utils";

type RuntimeTarget = "flue" | "eve";

interface RuntimeTargetToggleProps {
  value: RuntimeTarget;
  onValueChange: (value: RuntimeTarget) => void;
  disabled?: boolean;
}

const options: Array<{ value: RuntimeTarget; label: string }> = [
  { value: "flue", label: "Flue ☁" },
  { value: "eve", label: "EVE ▲" },
];

export function RuntimeTargetToggle({ value, onValueChange, disabled = false }: RuntimeTargetToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 backdrop-blur-sm">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            disabled={disabled}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70",
              disabled && "cursor-not-allowed opacity-60",
              isActive
                ? "bg-gradient-to-r from-fuchsia-500/80 to-violet-500/80 text-white shadow-[0_0_20px_rgba(192,38,211,0.35)]"
                : "text-white/75 hover:text-white"
            )}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
