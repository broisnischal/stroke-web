import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, sharedStyles as s } from "./layout";

export interface PurchaseSuccessEmailProps {
  /** Recipient's display name. */
  name: string;
  /** Human-readable plan, e.g. "Stroke Pro" or "Stroke Team". */
  planLabel: string;
  /** Formatted amount charged, e.g. "$29.00". Omitted when unknown. */
  amountFormatted?: string;
  /** The user's license key, so they can activate the desktop app. */
  licenseKey?: string;
  /** Link to the in-app billing/downloads page. */
  appUrl: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function PurchaseSuccessEmail({
  name,
  planLabel,
  amountFormatted,
  licenseKey,
  appUrl,
}: PurchaseSuccessEmailProps) {
  return (
    <EmailLayout preview={`Your ${planLabel} purchase is confirmed`}>
      <Text style={s.heading}>Payment successful 🎉</Text>
      <Text style={s.paragraph}>
        Hi {firstName(name)}, thanks for your purchase. Your {planLabel} license is active and ready
        to use.
      </Text>

      <Section style={s.detailBox}>
        <Text style={s.detailRow}>
          <span style={s.detailLabel}>Plan</span>&nbsp;&nbsp;{planLabel}
        </Text>
        {amountFormatted ? (
          <Text style={s.detailRow}>
            <span style={s.detailLabel}>Amount</span>&nbsp;&nbsp;{amountFormatted}
          </Text>
        ) : null}
        {licenseKey ? (
          <Text style={{ ...s.detailRow, wordBreak: "break-all", marginTop: "6px" }}>
            <span style={s.detailLabel}>License key</span>
            <br />
            <span style={{ fontFamily: "monospace", color: "#09090b" }}>{licenseKey}</span>
          </Text>
        ) : null}
      </Section>

      <Button href={appUrl} style={s.button}>
        Open Stroke
      </Button>

      <Text style={{ ...s.paragraph, marginTop: "24px", fontSize: "13px", color: "#71717a" }}>
        Keep this email for your records. If you have any questions, just reply and we'll help you
        out.
      </Text>
    </EmailLayout>
  );
}

// Preview props for `email dev` / react-email preview server.
PurchaseSuccessEmail.PreviewProps = {
  name: "Ada Lovelace",
  planLabel: "Stroke Pro",
  amountFormatted: "$29.00",
  licenseKey: "STRK-XXXX-XXXX-XXXX-XXXX",
  appUrl: "https://stroke.click/app/billing",
} satisfies PurchaseSuccessEmailProps;

export default PurchaseSuccessEmail;
