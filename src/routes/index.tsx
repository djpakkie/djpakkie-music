import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { formatTime, usePlayer } from "@/lib/player-context";
import { useTracks } from "@/lib/use-tracks";
import { Play, Pause } from "lucide-react";
import { AnimatedCover } from "@/components/animated-cover";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: tracks = [], isLoading: loading, error } = useTracks();
  const { current, isPlaying, playTrack, toggle } = usePlayer();
  const search = useSearch({ strict: false }) as { q?: string };
  const query = (search.q ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return tracks;
    return tracks.filter((t) =>
      [t.title, t.artist, t.album]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query)),
    );
  }, [tracks, query]);

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load the library.");
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="border-b border-border py-20 sm:py-28">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Vol. 01 · {new Date().getFullYear()}
        </p>
        <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
          A quiet room <em className="italic text-muted-foreground">for sound.</em>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          A personal library, hand-picked and streamed. No algorithms, no playlists — just records,
          in the order they were placed on the shelf.
        </p>
      </section>

      {/* Library */}
      <section className="py-16">
        <div className="mb-10 flex items-baseline justify-between">
          <h2 className="text-2xl">Library</h2>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {query
              ? `${filtered.length} of ${tracks.length}`
              : `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`}
          </span>
        </div>

        {loading ? (
          <ol className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="grid grid-cols-[2.5rem_3.5rem_1fr_auto] items-center gap-4 py-4"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-14 w-14 rounded-sm" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-3 w-10" />
              </li>
            ))}
          </ol>
        ) : tracks.length === 0 ? (
          <div className="border border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl text-muted-foreground">The shelf is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in as admin to upload the first record.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl text-muted-foreground">No matches for “{query}”.</p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {filtered.map((t, i) => {
              const isCurrent = current?.id === t.id;
              return (
                <li
                  key={t.id}
                  className="group grid grid-cols-[2.5rem_3.5rem_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-accent/40"
                >
                  <button
                    onClick={() => (isCurrent ? toggle() : playTrack(t, filtered))}
                    className="relative flex h-8 w-8 items-center justify-center text-sm tabular-nums text-muted-foreground"
                    aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                  >
                    <span className="group-hover:opacity-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                  </button>

                  <button
                    onClick={() => (isCurrent ? toggle() : playTrack(t, filtered))}
                    className="block h-14 w-14 cursor-pointer"
                    aria-label={isCurrent && isPlaying ? "Pause" : `Play ${t.title}`}
                  >
                    {t.cover_url ? (
                      <img src={t.cover_url} alt="" className="h-14 w-14 rounded-sm object-cover" />
                    ) : (
                      <AnimatedCover
                        seed={t.id}
                        label={(t.title?.[0] ?? "♪").toUpperCase()}
                        className="h-14 w-14 rounded-sm"
                      />
                    )}
                  </button>

                  <button
                    onClick={() => (isCurrent ? toggle() : playTrack(t, filtered))}
                    className="min-w-0 cursor-pointer text-left"
                    aria-label={isCurrent && isPlaying ? "Pause" : `Play ${t.title}`}
                  >
                    <div className="truncate font-display text-lg">{t.title}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {t.artist}
                      {t.album && <span className="opacity-60"> — {t.album}</span>}
                    </div>
                  </button>

                  <div className="text-sm tabular-nums text-muted-foreground">
                    {t.duration_seconds ? formatTime(t.duration_seconds) : "—"}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
