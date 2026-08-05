import { createFileRoute } from "@tanstack/react-router";

import { deviceIdFrom, FREE_TIER, remainingForDevice } from "#/lib/ai/free-tier";

/**
 * GET /api/ai/quota
 *
 * Lets the desktop app show what's left before the user hits a wall mid-thought.
 * Cheap enough to call on app start and after a turn.
 */
export const Route = createFileRoute("/api/ai/quota")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deviceId = deviceIdFrom(request);
        if (!deviceId) {
          return Response.json({ error: { code: "missing_device" } }, { status: 401 });
        }
        const remaining = await remainingForDevice(deviceId);
        return Response.json({
          remaining,
          limit: FREE_TIER.perDeviceDaily,
          resets: "daily-utc",
        });
      },
    },
  },
});
