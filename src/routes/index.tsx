import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, usePlayer, type Track } from "@/lib/player-context";
import { Play, Pause } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { current, isPlaying, playTrack, toggle } = usePlayer();

  useEffect(() => {
    supabase
      .from("tracks")
      .select("id,title,artist,album,cover_url,audio_url,duration_seconds")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTracks((data as Track[]) ?? []);
        setLoading(false);
      });
  }, []);

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
          A personal library, hand-picked and streamed. No algorithms, no playlists — just
          records, in the order they were placed on the shelf.
        </p>
      </section>

      {/* Library */}
      <section className="py-16">
        <div className="mb-10 flex items-baseline justify-between">
          <h2 className="text-2xl">Library</h2>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tracks.length === 0 ? (
          <div className="border border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl text-muted-foreground">The shelf is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in as admin to upload the first record.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {tracks.map((t, i) => {
              const isCurrent = current?.id === t.id;
              return (
                <li
                  key={t.id}
                  className="group grid grid-cols-[2.5rem_3.5rem_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-accent/40"
                >
                  <button
                    onClick={() => (isCurrent ? toggle() : playTrack(t, tracks))}
                    className="relative flex h-8 w-8 items-center justify-center text-sm tabular-nums text-muted-foreground"
                    aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                  >
                    <span className="group-hover:opacity-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                  </button>

                  {t.cover_url ? (
                    <img
                      src={t.cover_url}
                      alt=""
                      className="h-14 w-14 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-accent">
                      <span className="font-display text-xl text-muted-foreground">♪</span>
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="truncate font-display text-lg">{t.title}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {t.artist}
                      {t.album && <span className="opacity-60"> — {t.album}</span>}
                    </div>
                  </div>

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
