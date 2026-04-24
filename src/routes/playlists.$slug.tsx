import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, usePlayer, type Track } from "@/lib/player-context";
import { useAuth } from "@/lib/auth";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/playlists/$slug")({
  component: PlaylistDetail,
});

type Playlist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

function PlaylistDetail() {
  const { slug } = Route.useParams();
  const { isAdmin } = useAuth();
  const nav = useNavigate();
  const { current, isPlaying, playTrack, toggle } = usePlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: pl } = await supabase
      .from("playlists")
      .select("id,slug,title,description,cover_url")
      .eq("slug", slug)
      .maybeSingle();
    if (!pl) {
      setLoading(false);
      return;
    }
    setPlaylist(pl as Playlist);

    const { data: items } = await supabase
      .from("playlist_tracks")
      .select("position,tracks(id,title,artist,album,cover_url,audio_url,duration_seconds)")
      .eq("playlist_id", pl.id)
      .order("position", { ascending: true });

    const ts = ((items as any[]) ?? [])
      .map((r) => r.tracks as Track)
      .filter(Boolean);
    setTracks(ts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function removeTrack(trackId: string) {
    if (!playlist) return;
    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id)
      .eq("track_id", trackId);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      setTracks((t) => t.filter((x) => x.id !== trackId));
    }
  }

  async function deletePlaylist() {
    if (!playlist) return;
    if (!confirm(`Delete playlist "${playlist.title}"?`)) return;
    const { error } = await supabase.from("playlists").delete().eq("id", playlist.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Playlist deleted");
      nav({ to: "/playlists" });
    }
  }

  if (loading) {
    return <div className="px-6 py-20 text-center text-muted-foreground">…</div>;
  }

  if (!playlist) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-3xl">Not found</h1>
        <Link to="/playlists" className="mt-6 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline">
          ← All playlists
        </Link>
      </div>
    );
  }

  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration_seconds ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/playlists" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Playlists
      </Link>

      <header className="mt-6 grid grid-cols-1 gap-10 border-b border-border pb-12 md:grid-cols-[18rem_1fr]">
        {playlist.cover_url ? (
          <img src={playlist.cover_url} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-accent">
            <span className="font-display text-7xl text-muted-foreground">♪</span>
          </div>
        )}
        <div className="flex flex-col justify-end">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Playlist</p>
          <h1 className="mt-3 text-5xl leading-tight sm:text-6xl">{playlist.title}</h1>
          {playlist.description && (
            <p className="mt-4 max-w-xl text-base text-muted-foreground">{playlist.description}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
            <span>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span>
            {totalSeconds > 0 && <span>· {formatTime(totalSeconds)}</span>}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              disabled={tracks.length === 0}
              onClick={() => tracks[0] && playTrack(tracks[0], tracks)}
              className="bg-foreground px-6 py-3 text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              ▶ Play
            </button>
            {isAdmin && (
              <>
                <Link
                  to="/playlists/$slug/edit"
                  params={{ slug: playlist.slug }}
                  className="border border-border px-6 py-3 text-xs uppercase tracking-widest hover:bg-accent"
                >
                  Edit tracks
                </Link>
                <button
                  onClick={deletePlaylist}
                  className="border border-border px-6 py-3 text-xs uppercase tracking-widest text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="py-10">
        {tracks.length === 0 ? (
          <div className="border border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl text-muted-foreground">Empty playlist.</p>
            {isAdmin && (
              <Link
                to="/playlists/$slug/edit"
                params={{ slug: playlist.slug }}
                className="mt-4 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline"
              >
                Add tracks →
              </Link>
            )}
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {tracks.map((t, i) => {
              const isCurrent = current?.id === t.id;
              return (
                <li
                  key={t.id}
                  className="group grid grid-cols-[2.5rem_3.5rem_1fr_auto_auto] items-center gap-4 py-4 transition-colors hover:bg-accent/40"
                >
                  <button
                    onClick={() => (isCurrent ? toggle() : playTrack(t, tracks))}
                    className="relative flex h-8 w-8 items-center justify-center text-sm tabular-nums text-muted-foreground"
                    aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                  >
                    <span className="group-hover:opacity-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                  </button>
                  {t.cover_url ? (
                    <img src={t.cover_url} alt="" className="h-14 w-14 rounded-sm object-cover" />
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
                  {isAdmin ? (
                    <button
                      onClick={() => removeTrack(t.id)}
                      className="text-xs uppercase tracking-widest text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
