import { useEffect, useState } from "react";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { usePlayer, formatTime } from "@/lib/player-context";
import { AnimatedCover } from "@/components/animated-cover";

/**
 * Floating "now playing" preview block, anchored bottom-left.
 * Sits above the main NowPlayingBar and can be dismissed by the user.
 */
export function NowPlayingPreview() {
  const { current, isPlaying, toggle, next, progress, duration } = usePlayer();
  const [dismissed, setDismissed] = useState(false);

  // Re-show the preview whenever a new track starts.
  useEffect(() => {
    if (current) setDismissed(false);
  }, [current?.id]);

  if (!current || dismissed) return null;

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div
      className="pointer-events-auto fixed right-6 top-24 z-40 w-80 overflow-hidden rounded-lg border border-border bg-background/60 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 sm:w-96"
      role="complementary"
      aria-label="Now playing preview"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 z-10 rounded-full bg-background/60 p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        aria-label="Hide now playing preview"
      >
        <X size={12} />
      </button>

      <div className="flex gap-3 p-3">
        <div className="relative h-16 w-16 flex-shrink-0">
          {current.cover_url ? (
            <img
              src={current.cover_url}
              alt=""
              className="h-16 w-16 rounded-sm object-cover"
            />
          ) : (
            <AnimatedCover
              seed={current.id}
              label={(current.title?.[0] ?? "♪").toUpperCase()}
              className="h-16 w-16 rounded-sm"
            />
          )}
          {isPlaying && (
            <span className="absolute bottom-1 right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Now Playing
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">{current.title}</p>
            <p className="truncate text-xs text-muted-foreground">{current.artist}</p>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Next"
            >
              <SkipForward size={14} />
            </button>
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <div className="h-0.5 w-full bg-border">
        <div
          className="h-full bg-foreground transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
