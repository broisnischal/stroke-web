import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, sharedStyles as s } from "./layout";

export interface PaymentFailedEmailProps {
  /** Recipient's display name. */
  name: string;
  /** Formatted amount attempted, e.g. "$29.00". Omitted when unknown. */
  amountFormatted?: string;
  /** Link to the in-app billing page where the user can retry. */
  retryUrl: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function PaymentFailedEmail({ name, amountFormatted, retryUrl }: PaymentFailedEmailProps) {
  return (
    <EmailLayout preview="We couldn't process your payment">
      <Text style={s.heading}>Payment failed</Text>
      <Text style={s.paragraph}>
        Hi {firstName(name)}, we tried to process your Stroke payment
        {amountFormatted ? ` of ${amountFormatted}` : ""} but it didn't go through. No charge was
        made.
      </Text>
      <Text style={s.paragraph}>
        This usually happens when a card is expired, has insufficient funds, or was declined by the
        bank. You can try again with a different payment method.
      </Text>

      <Section style={s.detailBox}>
        <Text style={s.detailRow}>
          <span style={s.detailLabel}>Status</span>&nbsp;&nbsp;Declined
        </Text>
        {amountFormatted ? (
          <Text style={s.detailRow}>
            <span style={s.detailLabel}>Amount</span>&nbsp;&nbsp;{amountFormatted}
          </Text>
        ) : null}
      </Section>

      <Button href={retryUrl} style={s.button}>
        Try again
      </Button>

      <Text style={{ ...s.paragraph, marginTop: "24px", fontSize: "13px", color: "#71717a" }}>
        If you keep running into trouble, reply to this email and we'll sort it out with you.
      </Text>
    </EmailLayout>
  );
}

PaymentFailedEmail.PreviewProps = {
  name: "Ada Lovelace",
  amountFormatted: "$29.00",
  retryUrl: "https://stroke.click/app/billing",
} satisfies PaymentFailedEmailProps;

export default PaymentFailedEmail;
