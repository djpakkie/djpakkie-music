import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

function UploadPage() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  async function getAudioDuration(file: File): Promise<number | null> {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile || !user) return;
    setBusy(true);
    try {
      const duration = await getAudioDuration(audioFile);

      const audioPath = `${user.id}/audio/${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: audioErr } = await supabase.storage
        .from("tracks")
        .upload(audioPath, audioFile, { contentType: audioFile.type });
      if (audioErr) throw audioErr;
      const { data: audioPub } = supabase.storage.from("tracks").getPublicUrl(audioPath);

      let cover_url: string | null = null;
      if (coverFile) {
        const coverPath = `${user.id}/covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: coverErr } = await supabase.storage
          .from("tracks")
          .upload(coverPath, coverFile, { contentType: coverFile.type });
        if (coverErr) throw coverErr;
        cover_url = supabase.storage.from("tracks").getPublicUrl(coverPath).data.publicUrl;
      }

      const { error: insertErr } = await supabase.from("tracks").insert({
        title,
        artist,
        album: album || null,
        audio_url: audioPub.publicUrl,
        cover_url,
        duration_seconds: duration,
        uploaded_by: user.id,
      });
      if (insertErr) throw insertErr;

      toast.success("Track added to library.");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="px-6 py-20 text-center text-muted-foreground">…</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Admin only</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your account is signed in but doesn't have the <code className="rounded bg-accent px-1">admin</code> role.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open Cloud → Database → <code className="rounded bg-accent px-1">user_roles</code> and insert a row with your user id and role <code className="rounded bg-accent px-1">admin</code>.
        </p>
        <Link to="/" className="mt-8 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-6 text-4xl">New track</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Add a record to the shelf. Audio files only (mp3, wav, flac, m4a).
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <Field label="Title" required>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <Field label="Artist" required>
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <Field label="Album">
          <input
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <Field label="Audio file" required>
          <input
            type="file"
            accept="audio/*"
            required
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest hover:file:bg-accent"
          />
        </Field>
        <Field label="Cover art (optional)">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest hover:file:bg-accent"
          />
        </Field>

        <button
          type="submit"
          disabled={busy || !audioFile}
          className="w-full bg-foreground py-3 text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Add to library"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-foreground">*</span>}
      </label>
      {children}
    </div>
  );
}
