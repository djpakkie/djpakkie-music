import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/requests")({
  component: RequestsAdmin,
});

type Req = {
  id: string;
  title: string;
  artist: string;
  note: string | null;
  requester_name: string | null;
  requester_email: string | null;
  status: "pending" | "fulfilled" | "rejected";
  created_at: string;
};

function RequestsAdmin() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Req[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  async function load() {
    setBusy(true);
    const { data, error } = await supabase
      .from("song_requests")
      .select("id,title,artist,note,requester_name,requester_email,status,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Req[]) ?? []);
    setBusy(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function setStatus(id: string, status: Req["status"]) {
    const { error } = await supabase
      .from("song_requests")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setItems((s) => s.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("song_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((s) => s.filter((r) => r.id !== id));
  }

  if (loading) return <div className="px-6 py-20 text-center text-muted-foreground">…</div>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Admin only</h1>
        <Link to="/" className="mt-8 inline-block text-xs uppercase tracking-widest underline-offset-4 hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-6 text-4xl">Song requests</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Listener suggestions for new tracks to add.
      </p>

      <div className="mt-10 space-y-3">
        {busy ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-border py-16 text-center text-muted-foreground">
            No requests yet.
          </div>
        ) : (
          items.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg">{r.title}</span>
                  <span className="text-sm text-muted-foreground">— {r.artist}</span>
                  <span
                    className={
                      "ml-2 rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                      (r.status === "pending"
                        ? "bg-accent text-foreground"
                        : r.status === "fulfilled"
                          ? "bg-foreground text-background"
                          : "border border-border text-muted-foreground")
                    }
                  >
                    {r.status}
                  </span>
                </div>
                {r.note && <p className="mt-1 text-sm text-muted-foreground">"{r.note}"</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.requester_name || "Anonymous"}
                  {r.requester_email ? ` · ${r.requester_email}` : ""} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                {r.status !== "fulfilled" && (
                  <button
                    onClick={() => setStatus(r.id, "fulfilled")}
                    className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-accent"
                  >
                    Fulfilled
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(r.id, "rejected")}
                    className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-accent"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
