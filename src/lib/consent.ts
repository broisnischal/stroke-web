import { useSyncExternalStore } from "react";

/**
 * Visitor's analytics-cookie decision. Stored in localStorage so it persists
 * across sessions; remembering the choice itself is a strictly-necessary use.
 */
export type ConsentChoice = "accepted" | "declined";

const STORAGE_KEY = "stroke-analytics-consent";
const listeners = new Set<() => void>();

export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

export function setConsent(choice: ConsentChoice): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, choice);
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

/**
 * Whether to show the consent banner: only once, on the client, when the
 * visitor hasn't decided yet. The server snapshot is `false` so the banner is
 * absent from SSR HTML (no flash for returning, already-decided visitors) and
 * appears after hydration only when a choice is still pending.
 */
export function useShowConsentBanner(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getConsent() === null,
    () => false,
  );
}
