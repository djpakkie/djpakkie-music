import { Search, X, Mic2 } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/lib/player-context";
import { useTracks } from "@/lib/use-tracks";
import { AnimatedCover } from "@/components/animated-cover";

export function SearchBar() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as { q?: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [value, setValue] = useState(search.q ?? "");
  const [focused, setFocused] = useState(false);
  // Shares the same cache entry as the homepage's useTracks() call, so this
  // doesn't trigger a second network request.
  const { data: tracks = [] } = useTracks();
  const { playTrack } = usePlayer();

  useEffect(() => {
    setValue(search.q ?? "");
  }, [search.q]);

  // Debounced URL sync (only when on the library page so we don't redirect away).
  useEffect(() => {
    const t = setTimeout(() => {
      if (pathname !== "/") return;
      const current = search.q ?? "";
      const next = value.trim();
      if (next === current) return;
      navigate({
        to: "/",
        search: next ? { q: next } : {},
        replace: true,
      });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname]);

  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!query) return [];
    return tracks
      .filter((t) =>
        [t.title, t.artist, t.album]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query)),
      )
      .slice(0, 6);
  }, [tracks, query]);

  const showDropdown = focused && query.length > 0;

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/request"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent/50 sm:text-sm"
        >
          <Mic2 size={14} aria-hidden />
          Request
        </Link>
        <div className="relative w-full max-w-xl">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background/60 px-4 py-2 shadow-sm focus-within:border-foreground/40">
            <Search size={16} className="text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder="Search tracks, artists, albums…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Search library"
            />
            {value && (
              <button
                onClick={() => setValue("")}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-border bg-background/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
              {suggestions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No matches for “{value}”.
                </div>
              ) : (
                <ul className="max-h-80 divide-y divide-border overflow-auto">
                  {suggestions.map((t) => (
                    <li key={t.id}>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          playTrack(t, suggestions);
                          setFocused(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50"
                      >
                        {t.cover_url ? (
                          <img
                            src={t.cover_url}
                            alt=""
                            className="h-10 w-10 flex-shrink-0 rounded-sm object-cover"
                          />
                        ) : (
                          <AnimatedCover
                            seed={t.id}
                            label={(t.title?.[0] ?? "♪").toUpperCase()}
                            className="h-10 w-10 flex-shrink-0 rounded-sm"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{t.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {t.artist}
                            {t.album && <span className="opacity-60"> — {t.album}</span>}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
