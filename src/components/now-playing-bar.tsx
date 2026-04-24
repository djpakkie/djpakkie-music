import { formatTime, usePlayer } from "@/lib/player-context";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

export function NowPlayingBar() {
  const { current, isPlaying, toggle, next, prev, progress, duration, seek } = usePlayer();

  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current.cover_url ? (
            <img
              src={current.cover_url}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-sm object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm bg-accent">
              <span className="font-display text-lg text-muted-foreground">♪</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{current.title}</div>
            <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
          </div>
        </div>

        <div className="flex flex-[2] flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={prev}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Previous"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Next"
            >
              <SkipForward size={18} />
            </button>
          </div>
          <div className="flex w-full items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-foreground"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden flex-1 sm:block" />
      </div>
    </div>
  );
}
