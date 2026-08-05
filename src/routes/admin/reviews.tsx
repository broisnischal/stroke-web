import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { StrokeIcon } from "#/components/stroke-icon";
import { buttonVariants } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import type { ReviewStatus } from "#/lib/db/schema";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Review moderation · Stroke admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReviewsPage,
});

const SECRET_KEY = "stroke-admin-secret";
const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

interface AdminReview {
  id: string;
  body: string;
  title: string | null;
  status: ReviewStatus;
  authorName: string;
  authorEmail: string;
  createdAt: number;
  approvedAt: number | null;
}

// Render nothing until the client takes over, so we never read sessionStorage
// during SSR. useSyncExternalStore keeps hydration clean without setState.
const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function AdminReviewsPage() {
  const isClient = useIsClient();
  if (!isClient) return <div className="min-h-screen bg-background" />;
  return <AdminReviews />;
}

function AdminReviews() {
  const queryClient = useQueryClient();
  const [secret, setSecret] = useState(() => window.sessionStorage.getItem(SECRET_KEY) ?? "");
  const [draft, setDraft] = useState(secret);
  const [status, setStatus] = useState<ReviewStatus>("pending");

  const list = useQuery({
    queryKey: ["admin-reviews", status, secret],
    enabled: secret.length > 0,
    retry: false,
    queryFn: async (): Promise<AdminReview[]> => {
      const res = await fetch(`/api/admin/reviews/list?status=${status}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) throw new Error("Invalid admin secret.");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { reviews: AdminReview[] };
      return data.reviews;
    },
  });

  const moderate = useMutation({
    mutationFn: async (input: { id: string; action: "approve" | "reject" | "unpublish" }) => {
      const res = await fetch("/api/admin/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Action failed (${res.status})`);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action failed."),
  });

  function saveSecret(value: string) {
    window.sessionStorage.setItem(SECRET_KEY, value);
    setSecret(value);
  }

  function signOut() {
    window.sessionStorage.removeItem(SECRET_KEY);
    setSecret("");
    setDraft("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-13 items-center justify-between border-b border-border/40 px-6">
        <Link to="/" className="flex items-center gap-2">
          <StrokeIcon className="size-5" />
          <span className="text-sm font-semibold tracking-tight">Stroke</span>
          <span className="text-sm text-muted-foreground">· Admin</span>
        </Link>
        {secret && (
          <button
            type="button"
            onClick={signOut}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Forget secret
          </button>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-xl font-semibold tracking-tight">Review moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve reviews to publish them on the landing page.
        </p>

        {!secret ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) saveSecret(draft.trim());
            }}
            className="mt-8 max-w-sm space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="secret" className="text-xs">
                Admin secret
              </Label>
              <Input
                id="secret"
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="LICENSE_ADMIN_SECRET"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Kept in this tab only (sessionStorage). Never sent anywhere but the Stroke admin
                API.
              </p>
            </div>
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              Continue
            </button>
          </form>
        ) : (
          <>
            <div className="mt-8 flex items-center gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    status === s
                      ? "bg-foreground/8 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {list.isError && (
              <div className="mt-6 rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {list.error instanceof Error ? list.error.message : "Failed to load."}
                {list.error instanceof Error && list.error.message.includes("secret") && (
                  <button
                    type="button"
                    onClick={signOut}
                    className="ml-2 underline underline-offset-2"
                  >
                    Re-enter
                  </button>
                )}
              </div>
            )}

            {list.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

            {list.data && list.data.length === 0 && (
              <p className="mt-6 text-sm text-muted-foreground">No {status} reviews.</p>
            )}

            <div className="mt-6 space-y-3">
              {list.data?.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  busy={moderate.isPending}
                  onAction={(action) => moderate.mutate({ id: r.id, action })}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ReviewCard({
  review,
  busy,
  onAction,
}: {
  review: AdminReview;
  busy: boolean;
  onAction: (action: "approve" | "reject" | "unpublish") => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <p className="text-sm leading-relaxed text-foreground/90">{review.body}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{review.authorName}</span>
          {review.title ? ` · ${review.title}` : ""} · {review.authorEmail}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {review.status !== "approved" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("approve")}
              className={buttonVariants({ size: "xs" })}
            >
              <CheckIcon className="size-3" />
              Approve
            </button>
          )}
          {review.status === "approved" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("unpublish")}
              className={buttonVariants({ variant: "outline", size: "xs" })}
            >
              <RotateCcwIcon className="size-3" />
              Unpublish
            </button>
          )}
          {review.status !== "rejected" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction("reject")}
              className={buttonVariants({ variant: "ghost", size: "xs" })}
            >
              <XIcon className="size-3" />
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
