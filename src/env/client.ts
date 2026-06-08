import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    // Dodo Payments static payment link for the Stroke license, e.g.
    // https://test.checkout.dodopayments.com/buy/pdt_xxxxxxxx (test mode)
    // https://checkout.dodopayments.com/buy/pdt_xxxxxxxx (live mode)
    VITE_DODO_CHECKOUT_URL: z.url().optional(),
  },
  runtimeEnv: import.meta.env,
});
