import { createFileRoute } from "@tanstack/react-router";

import { FREE_MODELS } from "#/lib/ai/free-tier";

/**
 * GET /api/ai/models
 *
 * OpenAI-shaped model list so the desktop app's existing live discovery works
 * against this gateway with no special-casing. The ids are aliases we own, not
 * upstream model names, so routing can change without breaking a saved profile.
 */
export const Route = createFileRoute("/api/ai/models")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          object: "list",
          data: FREE_MODELS.map((m) => ({
            id: m.id,
            object: "model",
            owned_by: "stroke",
            description: m.description,
          })),
        }),
    },
  },
});
