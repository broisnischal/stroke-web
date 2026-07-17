import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2Icon, ClockIcon, KeyRoundIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { buttonVariants } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { licenseQueryOptions } from "#/lib/billing/functions";
import { $submitReview, myReviewQueryOptions } from "#/lib/reviews/functions";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_auth/app/reviews")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(licenseQueryOptions());
    context.queryClient.prefetchQuery(myReviewQueryOptions());
  },
  component: ReviewsPage,
});

const MAX_BODY = 1000;

const STATUS_META = {
  pending: {
    label: "In review",
    icon: ClockIcon,
    className: "border-amber-500/20 bg-amber-500/6 text-amber-500",
    note: "Thanks! Your review is waiting for approval before it shows on the site.",
  },
  approved: {
    label: "Published",
    icon: CheckCircle2Icon,
    className: "border-emerald-500/20 bg-emerald-500/6 text-emerald-500",
    note: "Your review is live on the landing page. Editing it will send it back for review.",
  },
  rejected: {
    label: "Not approved",
    icon: XCircleIcon,
    className: "border-border/40 text-muted-foreground",
    note: "This review wasn't approved. You can edit it and resubmit.",
  },
} as const;

function ReviewsPage() {
  const queryClient = useQueryClient();
  const { data: license, isPending: licensePending } = useQuery(licenseQueryOptions());
  const { data: myReview } = useQuery(myReviewQueryOptions());

  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  // Seed the form from an existing review the first time it arrives. Done during
  // render (not in an effect) per React's "adjust state when a prop changes"
  // pattern; `seededFor` tracks the review identity so we don't clobber edits.
  const [seededFor, setSeededFor] = useState<string | null | undefined>(undefined);
  if (myReview !== undefined && seededFor !== (myReview?.id ?? null)) {
    setSeededFor(myReview?.id ?? null);
    setBody(myReview?.body ?? "");
    setTitle(myReview?.title ?? "");
  }

  const submit = useMutation({
    mutationFn: (input: { body: string; title?: string }) => $submitReview({ data: input }),
    onSuccess: async () => {
      toast.success("Review submitted — it'll show once approved.");
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your review.");
    },
  });

  function doSubmit() {
    const trimmed = body.trim();
    if (trimmed.length < 10) {
      toast.error("Please write at least a sentence.");
      return;
    }
    submit.mutate({ body: trimmed, title: title.trim() || undefined });
  }

  // ── Not licensed ──────────────────────────────────────────────────────────
  if (!licensePending && !license) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Leave a review</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Reviews are open to Stroke license holders.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-border/40 px-4 py-3 text-sm text-muted-foreground">
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium text-foreground">You need a license first</p>
            <p className="mt-0.5 text-xs">
              Once you own Stroke you can share what you think, and your words may appear on the
              landing page.
            </p>
          </div>
        </div>
        <Link to="/app/billing" className={buttonVariants({ size: "sm" })}>
          <KeyRoundIcon className="size-3.5" />
          Get a license
        </Link>
      </div>
    );
  }

  const status = myReview?.status;
  const meta = status ? STATUS_META[status] : null;
  const remaining = MAX_BODY - body.length;

  // ── Licensed: write / edit ──────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight">
          {myReview ? "Your review" : "Leave a review"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Share how Stroke works for you. Approved reviews appear on the landing page.
        </p>
      </div>

      {meta && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
            meta.className,
          )}
        >
          <meta.icon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{meta.label}</p>
            <p className="mt-0.5 text-[11px] opacity-80">{meta.note}</p>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSubmit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="review-body" className="text-xs">
            Your review
          </Label>
          <Textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            placeholder="Stroke replaced three tools for me. It launches instantly and…"
            className="min-h-32"
            required
          />
          <p className="text-right text-[11px] text-muted-foreground/70">{remaining} left</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="review-title" className="text-xs">
            Byline <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Backend engineer at Acme"
          />
          <p className="text-[11px] text-muted-foreground/70">
            Shown under your name. Leave blank to show just your name.
          </p>
        </div>

        <button
          type="submit"
          disabled={submit.isPending}
          className={buttonVariants({ size: "sm" })}
        >
          {submit.isPending ? "Submitting…" : myReview ? "Update review" : "Submit review"}
        </button>
      </form>
    </div>
  );
}
