import { useRetro, type RetroIntensity } from "@/lib/retro-context";
import { Sparkles } from "lucide-react";

const OPTIONS: { value: RetroIntensity; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
];

/**
 * Small inline control for the animated retro background intensity.
 * Persists via RetroProvider (localStorage).
 */
export function RetroIntensityControl() {
  const { intensity, setIntensity } = useRetro();

  return (
    <label className="flex items-center gap-1.5 text-muted-foreground" title="Background animation">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Background animation</span>
      <select
        value={intensity}
        onChange={(e) => setIntensity(e.target.value as RetroIntensity)}
        className="cursor-pointer rounded-sm border border-border bg-background/60 px-1.5 py-1 text-xs uppercase tracking-widest text-foreground outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Background animation intensity"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
