import { useRetro } from "@/lib/retro-context";

/**
 * Animated retro background.
 *
 * Sits fixed behind all content. Reacts to the user's intensity preference
 * (off/low/high) from RetroProvider — applied via the `data-retro` attribute
 * on <html> and consumed by CSS in styles.css.
 */
export function RetroBackground() {
  const { intensity } = useRetro();

  if (intensity === "off") return null;

  return (
    <div aria-hidden className="retro-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="retro-bg__gradient absolute inset-0" />
      <div className="retro-bg__grid absolute inset-0 opacity-[0.18]" />
      <div className="retro-bg__sun absolute left-1/2 top-[58%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full" />
      <div className="retro-bg__scanlines absolute inset-0" />
      <div className="retro-bg__noise absolute inset-0 opacity-[0.05] mix-blend-overlay" />
    </div>
  );
}
