import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tracksQueryKey } from "@/lib/use-tracks";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
});

const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100MB — generous for lossless files
const MAX_COVER_BYTES = 8 * 1024 * 1024; // 8MB

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadPage() {
  const { user, session, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [coverProgress, setCoverProgress] = useState(0);

  const coverPreviewUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile],
  );
  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  function handleAudioChange(file: File | null) {
    if (file && file.size > MAX_AUDIO_BYTES) {
      toast.error(
        `Audio file is too large (${formatBytes(file.size)}). Max is ${formatBytes(MAX_AUDIO_BYTES)}.`,
      );
      return;
    }
    setAudioFile(file);
    setAudioProgress(0);
  }

  function handleCoverChange(file: File | null) {
    if (file && file.size > MAX_COVER_BYTES) {
      toast.error(
        `Cover image is too large (${formatBytes(file.size)}). Max is ${formatBytes(MAX_COVER_BYTES)}.`,
      );
      return;
    }
    setCoverFile(file);
    setCoverProgress(0);
  }

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
    if (!audioFile || !user || !session) return;
    setBusy(true);
    setAudioProgress(0);
    setCoverProgress(0);
    try {
      const duration = await getAudioDuration(audioFile);
      const accessToken = session.access_token;

      const audioPath = `${user.id}/audio/${Date.now()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await uploadWithProgress("tracks", audioPath, audioFile, accessToken, setAudioProgress);
      const { data: audioPub } = supabase.storage.from("tracks").getPublicUrl(audioPath);

      let cover_url: string | null = null;
      if (coverFile) {
        const coverPath = `${user.id}/covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        await uploadWithProgress("tracks", coverPath, coverFile, accessToken, setCoverProgress);
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

      // So the homepage/search bar show the new track without a manual refresh.
      await queryClient.invalidateQueries({ queryKey: tracksQueryKey });

      toast.success("Track added to library.");
      nav({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
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
          Your account is signed in but doesn't have the{" "}
          <code className="rounded bg-accent px-1">admin</code> role.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Open Cloud → Database → <code className="rounded bg-accent px-1">user_roles</code> and
          insert a row with your user id and role{" "}
          <code className="rounded bg-accent px-1">admin</code>.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline"
        >
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link
        to="/"
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
      <h1 className="mt-6 text-4xl">New track</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Add a record to the shelf. Audio files only (mp3, wav, flac, m4a), up to{" "}
        {formatBytes(MAX_AUDIO_BYTES)}.
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
            onChange={(e) => handleAudioChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest hover:file:bg-accent"
          />
          {audioFile && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {audioFile.name} · {formatBytes(audioFile.size)}
            </p>
          )}
          {busy && audioFile && <ProgressBar value={audioProgress} label="Uploading audio" />}
        </Field>
        <Field label="Cover art (optional)">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest hover:file:bg-accent"
          />
          {coverPreviewUrl && (
            <img
              src={coverPreviewUrl}
              alt="Cover preview"
              className="mt-2 h-24 w-24 rounded-sm border border-border object-cover"
            />
          )}
          {busy && coverFile && <ProgressBar value={coverProgress} label="Uploading cover" />}
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

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}%</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-accent">
        <div
          className="h-full bg-foreground transition-[width] duration-150"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-foreground">*</span>}
      </label>
      {children}
    </div>
  );
}
