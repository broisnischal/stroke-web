import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(1),

    // OAuth2 providers, optional
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // License key signing (Ed25519 private key hex, 32 bytes)
    LICENSE_PRIVATE_KEY_HEX: z.string().length(64),
    // Admin API secret for license management
    LICENSE_ADMIN_SECRET: z.string().min(32),

    // Dodo Payments
    DODO_PAYMENTS_API_KEY: z.string().min(1),
    DODO_WEBHOOK_KEY: z.string().min(1),
    DODO_PRODUCT_ID: z.string().min(1),
    DODO_ENVIRONMENT: z.enum(["live_mode", "test_mode"]).default("test_mode"),
  },
  runtimeEnv: process.env,
});
