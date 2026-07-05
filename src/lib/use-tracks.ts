import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/lib/player-context";

export const tracksQueryKey = ["tracks"] as const;

async function fetchTracks(): Promise<Track[]> {
  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,artist,album,cover_url,audio_url,duration_seconds")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Track[]) ?? [];
}

/**
 * Shared, cached track list. Any component that calls this hook shares the
 * same query cache entry, so mounting the homepage and the search bar at the
 * same time results in a single network request instead of two.
 */
export function useTracks() {
  return useQuery({
    queryKey: tracksQueryKey,
    queryFn: fetchTracks,
  });
}
