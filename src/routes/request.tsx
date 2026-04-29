import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/request")({
  component: RequestPage,
  head: () => ({
    meta: [
      { title: "Request a song · DJ Pakkie" },
      {
        name: "description",
        content:
          "Suggest a favorite song for DJ Pakkie to add to the library.",
      },
    ],
  }),
});

const schema = z.object({
  title: z.string().trim().min(1, "Song title is required").max(150),
  artist: z.string().trim().min(1, "Artist is required").max(150),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  requester_name: z.string().trim().max(80).optional().or(z.literal("")),
  requester_email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(255)
    .optional()
    .or(z.literal("")),
});

function RequestPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      title,
      artist,
      note,
      requester_name: name,
      requester_email: email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("song_requests").insert({
      title: parsed.data.title,
      artist: parsed.data.artist,
      note: parsed.data.note || null,
      requester_name: parsed.data.requester_name || null,
      requester_email: parsed.data.requester_email || null,
      requester_user_id: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    setTitle("");
    setArtist("");
    setNote("");
    toast.success("Request sent. Thanks for the suggestion!");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link
        to="/"
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Back
      </Link>
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Listener requests
      </p>
      <h1 className="mt-3 text-5xl">Request a song</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Got a track you'd love to hear in the library? Drop it here and DJ
        Pakkie will have a listen.
      </p>

      {submitted && (
        <div className="mt-8 border border-border bg-accent/30 px-4 py-3 text-sm">
          Thanks — your request is in the queue. Send another any time.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <Field label="Song title" required>
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <Field label="Artist" required>
          <input
            required
            maxLength={150}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <Field label="Why this song? (optional)">
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
          />
        </Field>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Your name (optional)">
            <input
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
            />
          </Field>
          <Field label="Email (optional)">
            <input
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={busy || !title || !artist}
          className="w-full bg-foreground py-3 text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
      </form>
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
