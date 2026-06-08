import "@tanstack/react-start/server-only";
import { env } from "#/env/server";

export function requireAdminSecret(request: Request): Response | null {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== env.LICENSE_ADMIN_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
