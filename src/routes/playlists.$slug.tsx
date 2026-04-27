import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, usePlayer, type Track } from "@/lib/player-context";
import { useAuth } from "@/lib/auth";
import { Pause, Play, FileAudio } from "lucide-react";
import { toast } from "sonner";
import { AnimatedCover } from "@/components/animated-cover";

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
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const { current, isPlaying, playTrack, toggle } = usePlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dropQueue, setDropQueue] = useState<
    { name: string; status: "pending" | "uploading" | "done" | "error"; error?: string }[]
  >([]);

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

  // ----- Drag-and-drop upload helpers -----
  function getAudioDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(isFinite(a.duration) ? Math.round(a.duration) : null);
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      a.src = url;
    });
  }

  function titleFromFilename(name: string): string {
    return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || name;
  }

  async function uploadAudioFile(audioFile: File): Promise<Track> {
    if (!user) throw new Error("Not signed in");
    const duration = await getAudioDuration(audioFile);
    const audioPath = `${user.id}/audio/${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: audioErr } = await supabase.storage
      .from("tracks")
      .upload(audioPath, audioFile, { contentType: audioFile.type });
    if (audioErr) throw audioErr;
    const audio_url = supabase.storage.from("tracks").getPublicUrl(audioPath).data.publicUrl;

    const { data: inserted, error: insertErr } = await supabase
      .from("tracks")
      .insert({
        title: titleFromFilename(audioFile.name),
        artist: "Unknown artist",
        album: null,
        audio_url,
        cover_url: null,
        duration_seconds: duration,
        uploaded_by: user.id,
      })
      .select("id,title,artist,album,cover_url,audio_url,duration_seconds")
      .single();
    if (insertErr) throw insertErr;
    return inserted as Track;
  }

  async function appendTracksToPlaylist(newTracks: Track[]) {
    if (!playlist || newTracks.length === 0) return;
    const startPos = tracks.length;
    const rows = newTracks.map((t, i) => ({
      playlist_id: playlist.id,
      track_id: t.id,
      position: startPos + i,
    }));
    const { error } = await supabase.from("playlist_tracks").insert(rows);
    if (error) throw error;
    setTracks((prev) => [...prev, ...newTracks]);
  }

  async function handleDroppedFiles(fileList: FileList | File[]) {
    if (!isAdmin) {
      toast.error("Only admins can upload music");
      return;
    }
    if (!user || !playlist) return;
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(f.name),
    );
    if (files.length === 0) {
      toast.error("Drop audio files only");
      return;
    }

    const queue = files.map((f) => ({ name: f.name, status: "pending" as const }));
    setDropQueue(queue);

    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setDropQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: "uploading" } : item)));
      try {
        const t = await uploadAudioFile(file);
        newTracks.push(t);
        setDropQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: "done" } : item)));
      } catch (err: any) {
        setDropQueue((q) =>
          q.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: err.message ?? "Failed" } : item,
          ),
        );
      }
    }

    if (newTracks.length > 0) {
      try {
        await appendTracksToPlaylist(newTracks);
        toast.success(`Added ${newTracks.length} track${newTracks.length > 1 ? "s" : ""}`);
      } catch (err: any) {
        toast.error(err.message ?? "Could not link tracks to playlist");
      }
    }

    setTimeout(() => setDropQueue([]), 2500);
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
    <div
      className="relative mx-auto max-w-6xl px-6 py-16"
      onDragEnter={(e) => {
        if (!isAdmin) return;
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (!isAdmin) return;
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!isAdmin) return;
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) handleDroppedFiles(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <div className="border-2 border-dashed border-foreground p-12 text-center">
            <FileAudio size={40} className="mx-auto text-foreground" />
            <p className="mt-4 font-display text-2xl">Drop to upload</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Audio files will be added to {playlist.title}
            </p>
          </div>
        </div>
      )}

      {dropQueue.length > 0 && (
        <div className="fixed bottom-28 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] border border-border bg-background shadow-lg">
          <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Uploading {dropQueue.filter((q) => q.status === "done").length}/{dropQueue.length}
          </div>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto">
            {dropQueue.map((item, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <FileAudio size={14} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{item.name}</span>
                <span
                  className={
                    item.status === "done"
                      ? "text-xs text-foreground"
                      : item.status === "error"
                        ? "text-xs text-destructive"
                        : "text-xs text-muted-foreground"
                  }
                >
                  {item.status === "pending" && "…"}
                  {item.status === "uploading" && "↑"}
                  {item.status === "done" && "✓"}
                  {item.status === "error" && "✕"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {isAdmin && (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Tip: drag audio files anywhere on this page to add them
            </p>
          )}
        </div>
      </header>

      <section className="py-10">
        {tracks.length === 0 ? (
          <div className="border border-dashed border-border py-20 text-center">
            <p className="font-display text-2xl text-muted-foreground">Empty playlist.</p>
            {isAdmin && (
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Drag audio files here, or{" "}
                <Link
                  to="/playlists/$slug/edit"
                  params={{ slug: playlist.slug }}
                  className="underline-offset-4 hover:underline"
                >
                  open the editor →
                </Link>
              </p>
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
                    <AnimatedCover
                      seed={t.id}
                      label={(t.title?.[0] ?? "♪").toUpperCase()}
                      className="h-14 w-14 rounded-sm"
                    />
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
