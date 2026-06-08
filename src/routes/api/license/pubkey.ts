import { createFileRoute } from "@tanstack/react-router";

import { getPublicKeyHex } from "#/lib/license/verify";

export const Route = createFileRoute("/api/license/pubkey")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ public_key_hex: getPublicKeyHex() });
      },
    },
  },
});
