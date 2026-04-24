import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, X, ArrowUp, ArrowDown, Upload } from "lucide-react";

export const Route = createFileRoute("/playlists/$slug/edit")({
  component: EditPlaylist,
});

type Playlist = { id: string; slug: string; title: string };
type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
};

function EditPlaylist() {
  const { slug } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<Track[]>([]); // ordered tracks in playlist
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);

  // Inline upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [upTitle, setUpTitle] = useState("");
  const [upArtist, setUpArtist] = useState("");
  const [upAlbum, setUpAlbum] = useState("");
  const [upAudio, setUpAudio] = useState<File | null>(null);
  const [upCover, setUpCover] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  async function load() {
    const { data: pl } = await supabase
      .from("playlists")
      .select("id,slug,title")
      .eq("slug", slug)
      .maybeSingle();
    if (!pl) return;
    setPlaylist(pl as Playlist);

    const [{ data: pt }, { data: tracks }] = await Promise.all([
      supabase
        .from("playlist_tracks")
        .select("position,tracks(id,title,artist,album,cover_url)")
        .eq("playlist_id", pl.id)
        .order("position", { ascending: true }),
      supabase
        .from("tracks")
        .select("id,title,artist,album,cover_url")
        .order("created_at", { ascending: false }),
    ]);

    setItems(((pt as any[]) ?? []).map((r) => r.tracks as Track).filter(Boolean));
    setAllTracks((tracks as Track[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function persistOrder(next: Track[]) {
    if (!playlist) return;
    setBusy(true);
    // Replace strategy: delete all, reinsert in order
    const { error: delErr } = await supabase
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id);
    if (delErr) {
      toast.error(delErr.message);
      setBusy(false);
      return;
    }
    if (next.length > 0) {
      const rows = next.map((t, i) => ({
        playlist_id: playlist.id,
        track_id: t.id,
        position: i,
      }));
      const { error } = await supabase.from("playlist_tracks").insert(rows);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
    }
    setItems(next);
    setBusy(false);
  }

  async function addTrack(t: Track) {
    if (items.find((x) => x.id === t.id)) {
      toast.info("Already in playlist");
      return;
    }
    await persistOrder([...items, t]);
    toast.success("Added");
  }

  async function removeAt(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    await persistOrder(next);
  }

  async function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    await persistOrder(next);
  }

  if (loading) return <div className="px-6 py-20 text-center text-muted-foreground">…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Admin only</h1>
      </div>
    );
  }

  if (!playlist) {
    return <div className="px-6 py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const inPlaylist = new Set(items.map((t) => t.id));
  const available = allTracks.filter((t) => !inPlaylist.has(t.id));

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/playlists/$slug" params={{ slug: playlist.slug }} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← {playlist.title}
      </Link>
      <h1 className="mt-6 text-4xl">Edit tracks</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Add tracks from your library and arrange the order. {busy && "Saving…"}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* In playlist */}
        <section>
          <h2 className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            In this playlist · {items.length}
          </h2>
          {items.length === 0 ? (
            <div className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No tracks yet. Add some from the right.
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {items.map((t, i) => (
                <li key={t.id} className="grid grid-cols-[1.5rem_3rem_1fr_auto] items-center gap-3 py-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t.cover_url ? (
                    <img src={t.cover_url} alt="" className="h-12 w-12 rounded-sm object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-accent">
                      <span className="font-display text-muted-foreground">♪</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-display">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, 1)}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => removeAt(i)}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Library */}
        <section>
          <h2 className="mb-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Your library · {available.length} available
          </h2>
          {available.length === 0 ? (
            <div className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {allTracks.length === 0 ? (
                <>
                  No tracks yet.{" "}
                  <Link to="/upload" className="underline">
                    Upload one
                  </Link>
                  .
                </>
              ) : (
                "All tracks are already in this playlist."
              )}
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {available.map((t) => (
                <li key={t.id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-3">
                  {t.cover_url ? (
                    <img src={t.cover_url} alt="" className="h-12 w-12 rounded-sm object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-accent">
                      <span className="font-display text-muted-foreground">♪</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-display">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => addTrack(t)}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-accent disabled:opacity-30"
                  >
                    <Plus size={12} /> Add
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
