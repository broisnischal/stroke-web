export type BillingEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.active"
  | "subscription.updated"
  | "subscription.renewed"
  | "subscription.on_hold"
  | "subscription.cancelled"
  | "refund.succeeded"
  | "unknown";

export interface BillingEventData {
  subscriptionId?: string;
  customerId?: string;
  paymentId?: string;
  plan?: string;
  status?: string;
  amount?: number;
  currency?: string;
  periodEnd?: Date;
  /** userId passed in checkout session metadata — used to link webhook events to DB users */
  userId?: string;
  /** customer email from the payment provider — fallback when userId is missing/stale */
  email?: string;
}

export interface BillingEvent {
  type: BillingEventType;
  data: BillingEventData;
  raw: unknown;
}

export interface CheckoutParams {
  productId: string;
  quantity?: number;
  customer: {
    email: string;
    name: string;
  };
  /** Passed through to webhook events so you can link the payment to a user */
  metadata?: Record<string, string>;
  returnUrl: string;
}

export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(params: CheckoutParams): Promise<string>;
  verifyWebhook(rawBody: string, headers: Record<string, string>): BillingEvent;
}
