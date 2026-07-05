import { formatTime, usePlayer } from "@/lib/player-context";
import { usePlayerKeyboardShortcuts } from "@/lib/use-player-keyboard-shortcuts";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
} from "lucide-react";
import { AnimatedCover } from "@/components/animated-cover";

export function NowPlayingBar() {
  const {
    current,
    isPlaying,
    toggle,
    next,
    prev,
    progress,
    duration,
    seek,
    volume,
    muted,
    setVolume,
    toggleMute,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
  } = usePlayer();

  // Active whenever a track is loaded, regardless of which page you're on.
  usePlayerKeyboardShortcuts();

  if (!current) return null;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current.cover_url ? (
            <img
              src={current.cover_url}
              alt=""
              className="h-12 w-12 flex-shrink-0 rounded-sm object-cover"
            />
          ) : (
            <AnimatedCover
              seed={current.id}
              label={(current.title?.[0] ?? "♪").toUpperCase()}
              className="h-12 w-12 flex-shrink-0 rounded-sm"
            />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{current.title}</div>
            <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
          </div>
        </div>

        <div className="flex flex-[2] flex-col items-center gap-1.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={
                "hidden transition-colors sm:block " +
                (shuffle ? "text-foreground" : "text-muted-foreground hover:text-foreground")
              }
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>
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
            <button
              onClick={cycleRepeat}
              className={
                "hidden transition-colors sm:block " +
                (repeat !== "off"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
              aria-label="Toggle repeat"
              aria-pressed={repeat !== "off"}
              title={`Repeat: ${repeat}`}
            >
              <RepeatIcon size={16} />
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
              aria-label="Seek"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-2 sm:flex">
          <button
            onClick={toggleMute}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <VolumeIcon size={18} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-foreground"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
