import { Search, X } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function SearchBar() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as { q?: string };
  const [value, setValue] = useState(search.q ?? "");

  useEffect(() => {
    setValue(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const t = setTimeout(() => {
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
  }, [value]);

  return (
    <div className="sticky top-16 z-20 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
        <Search size={16} className="text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
    </div>
  );
}
