import "@tanstack/react-start/server-only";
import { env } from "#/env/server";

const PLUNK_SEND_URL = "https://api.useplunk.com/v1/send";

export interface SendEmailParams {
  /** Recipient address (or addresses). */
  to: string | string[];
  subject: string;
  /** Rendered HTML body. */
  body: string;
  /** Sender display name. Defaults to the project name ("Stroke"). */
  name?: string;
  /** Override the from address. Defaults to env.PLUNK_FROM_EMAIL. */
  from?: string;
  /** Override the reply-to address. */
  reply?: string;
}

/**
 * Send a transactional email through Plunk (https://useplunk.com).
 *
 * Uses the REST API directly (works on Cloudflare Workers without the Node
 * SDK). Never throws: on misconfiguration or a Plunk error it logs and
 * returns false so callers — e.g. the billing webhook — never fail because of
 * mail delivery.
 *
 * @see https://docs.useplunk.com/api-reference/transactional/send
 */
export async function sendTransactionalEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = env.PLUNK_API_KEY;
  if (!apiKey) {
    console.warn("[mail] PLUNK_API_KEY not set — skipping email to", params.to);
    return false;
  }

  try {
    const res = await fetch(PLUNK_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        body: params.body,
        name: params.name ?? "Stroke",
        from: params.from ?? env.PLUNK_FROM_EMAIL,
        ...(params.reply ? { reply: params.reply } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const recipient = Array.isArray(params.to) ? params.to.join(", ") : params.to;
      console.error(`[mail] Plunk send failed (${res.status}) to ${recipient}: ${detail}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[mail] Plunk send threw for", params.to, err);
    return false;
  }
}
