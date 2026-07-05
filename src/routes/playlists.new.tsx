import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/playlists/new")({
  component: NewPlaylist,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function NewPlaylist() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let cover_url: string | null = null;
      if (coverFile) {
        const path = `${user.id}/playlist-covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage
          .from("tracks")
          .upload(path, coverFile, { contentType: coverFile.type });
        if (error) throw error;
        cover_url = supabase.storage.from("tracks").getPublicUrl(path).data.publicUrl;
      }

      const baseSlug = slugify(title) || `playlist-${Date.now()}`;
      let slug = baseSlug;
      // Ensure uniqueness with simple suffix loop
      for (let i = 2; i < 20; i++) {
        const { data: existing } = await supabase
          .from("playlists")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${i}`;
      }

      const { data, error } = await supabase
        .from("playlists")
        .insert({
          title,
          slug,
          description: description || null,
          cover_url,
          created_by: user.id,
        })
        .select("slug")
        .single();
      if (error) throw error;

      toast.success("Playlist created. Now add tracks.");
      nav({ to: "/playlists/$slug/edit", params: { slug: data.slug } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create playlist");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="px-6 py-20 text-center text-muted-foreground">…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Admin only</h1>
        <Link to="/playlists" className="mt-8 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/playlists" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Playlists
      </Link>
      <h1 className="mt-6 text-4xl">New playlist</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Give it a name. You'll add tracks on the next step.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Title <span className="text-foreground">*</span>
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
            Cover image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest hover:file:bg-accent"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !title}
          className="w-full bg-foreground py-3 text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create playlist"}
        </button>
      </form>
    </div>
  );
}
