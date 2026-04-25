import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/playlists/")({
  component: PlaylistsIndex,
  head: () => ({
    meta: [
      { title: "Playlists · DJ Pakkie" },
      { name: "description", content: "Hand-curated playlists, in order." },
    ],
  }),
});

type Playlist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
};

function PlaylistsIndex() {
  const { isAdmin } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("playlists")
      .select("id,slug,title,description,cover_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPlaylists((data as Playlist[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Selections
          </p>
          <h1 className="text-5xl">Playlists</h1>
        </div>
        {isAdmin && (
          <Link
            to="/playlists/new"
            className="bg-foreground px-4 py-2 text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-90"
          >
            New playlist
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : playlists.length === 0 ? (
        <div className="border border-dashed border-border py-20 text-center">
          <p className="font-display text-2xl text-muted-foreground">No playlists yet.</p>
          {isAdmin && (
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first one to start curating.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {isAdmin && (
            <Link to="/playlists/new" className="group block">
              <div className="flex aspect-square w-full items-center justify-center border-2 border-dashed border-border bg-background transition-colors group-hover:border-foreground group-hover:bg-accent/30">
                <span className="font-display text-6xl text-muted-foreground transition-colors group-hover:text-foreground">
                  +
                </span>
              </div>
              <div className="mt-4">
                <div className="font-display text-xl text-muted-foreground transition-colors group-hover:text-foreground">
                  Add new playlist
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Start a fresh selection.
                </div>
              </div>
            </Link>
          )}
          {playlists.map((p) => (
            <Link
              key={p.id}
              to="/playlists/$slug"
              params={{ slug: p.slug }}
              className="group block"
            >
              {p.cover_url ? (
                <img
                  src={p.cover_url}
                  alt=""
                  className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-accent">
                  <span className="font-display text-6xl text-muted-foreground">♪</span>
                </div>
              )}
              <div className="mt-4">
                <div className="font-display text-xl">{p.title}</div>
                {p.description && (
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
