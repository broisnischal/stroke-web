import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const SITE_URL = "https://stroke.click";

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e4e4e7",
    maxWidth: "480px",
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    padding: "28px 40px 0",
  },
  wordmark: {
    fontSize: "18px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "#09090b",
    margin: 0,
  },
  content: {
    padding: "8px 40px 32px",
  },
  footer: {
    padding: "0 40px 32px",
  },
  footerText: {
    fontSize: "12px",
    lineHeight: "18px",
    color: "#a1a1aa",
    margin: "4px 0",
  },
  footerLink: {
    color: "#71717a",
    textDecoration: "underline",
  },
  hr: {
    borderColor: "#e4e4e7",
    margin: "0 40px",
  },
} as const;

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

/** Shared branded wrapper for every transactional email. */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.wordmark}>Stroke</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You received this email because of activity on your Stroke account.
            </Text>
            <Text style={styles.footerText}>
              <Link href={SITE_URL} style={styles.footerLink}>
                stroke.click
              </Link>{" "}
              · © {new Date().getFullYear()} Stroke
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const sharedStyles = {
  heading: {
    fontSize: "22px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    color: "#09090b",
    margin: "16px 0 8px",
  },
  paragraph: {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#3f3f46",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: "#09090b",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 24px",
  },
  detailBox: {
    backgroundColor: "#fafafa",
    border: "1px solid #e4e4e7",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "0 0 24px",
  },
  detailRow: {
    fontSize: "14px",
    lineHeight: "22px",
    color: "#52525b",
    margin: 0,
  },
  detailLabel: {
    color: "#a1a1aa",
  },
} as const;
