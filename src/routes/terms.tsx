import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalList, LegalPage, LegalSection } from "#/components/legal";
import { REPO_URL } from "#/components/site-chrome";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: "Terms of Service — Stroke",
      description:
        "The terms that govern your use of the Stroke desktop application, the stroke.click website, and Stroke licenses.",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 2, 2026"
      intro="These terms govern your use of the Stroke desktop application, the stroke.click website, and Stroke licenses. They are written to be read, not skimmed. The short version: the app is free to try, a license is a one-time purchase that is yours for good, and we ask you to use both in good faith."
    >
      <LegalSection number="01" title="Who we are">
        <p>
          Stroke is a desktop database client distributed from{" "}
          <a href="https://stroke.click">stroke.click</a>. "Stroke", "we", and "us" refer to the
          developer of the application. By creating an account, purchasing a license, or using the
          website, you agree to these terms. Using the desktop application alone does not require an
          account or an agreement beyond the software license described below.
        </p>
      </LegalSection>

      <LegalSection number="02" title="The software">
        <p>
          The Stroke application is proprietary software, protected by copyright. We grant you a
          personal, non-transferable license to install and run it on devices you control: free of
          charge while you evaluate it, and permanently once you purchase a license (section 04).
        </p>
        <p>
          You may not resell, redistribute, or sublicense the application, remove its license
          checks, or present it as your own work. The software is provided{" "}
          <strong>"as is", without warranty of any kind</strong>; see section 08.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Accounts">
        <p>
          An account is only needed to purchase and manage a license. You can sign in with GitHub or
          Google. You are responsible for activity that happens under your account, and you agree to
          give us accurate information. We may suspend accounts that abuse the service — for
          example, attempts to defraud the licensing system or attack the website.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Licenses">
        <p>
          A Stroke license is a <strong>one-time purchase of $9.99</strong> that makes the app
          yours. We price it as low as we can while keeping the project alive. When you buy one:
        </p>
        <LegalList
          items={[
            <>
              You <strong>own your license permanently</strong>. It is not a subscription — it never
              renews, never expires, and includes every future update of the app.
            </>,
            <>
              You receive a <strong>license key</strong> tied to your account, which can be
              activated on up to <strong>2 devices</strong> at the same time. You can deactivate a
              device from your dashboard to free a seat.
            </>,
            <>
              The license is personal to you. Don't publish, resell, or share your key — we may
              revoke keys that are leaked or abused.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection number="05" title="Payments and refunds">
        <p>
          Payments are processed by <strong>Dodo Payments</strong>, our payment provider and
          merchant of record. We never see or store your card details. Prices are shown at checkout
          in USD unless stated otherwise.
        </p>
        <p>
          A license is a single payment — there are no recurring charges to cancel. If something
          went wrong — a duplicate charge, a mistake at checkout, or a license that doesn't activate
          — contact us within 14 days and we will make it right.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Acceptable use">
        <p>When using the website and licensing service, you agree not to:</p>
        <LegalList
          items={[
            "Probe, disrupt, or overload the service, or attempt to access accounts or data that are not yours.",
            "Circumvent, spoof, or reverse-engineer the license verification, or use keys you did not purchase.",
            "Use the service in violation of laws that apply to you.",
          ]}
        />
      </LegalSection>

      <LegalSection number="07" title="Your data and your databases">
        <p>
          Stroke connects to your databases directly from your device. Your connection credentials,
          queries, and query results stay on your machine and are never transmitted to our servers.
          What little we do collect is described in the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Disclaimer of warranty">
        <p>
          The software and the service are provided <strong>"as is"</strong> and{" "}
          <strong>"as available"</strong>, without warranties of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and non-infringement. Stroke
          is a tool that operates on your databases at your direction — you are responsible for your
          own backups and for the queries you run.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for any indirect, incidental,
          special, or consequential damages, or for loss of data, profits, or business, arising from
          your use of the software or the service. Our total liability for any claim is limited to
          the amount you paid us in the 12 months before the claim arose.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Changes to these terms">
        <p>
          We may update these terms as the project evolves. If a change is material, we will note it
          on this page and update the date at the top. Continuing to use the service after a change
          takes effect means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection number="11" title="Contact">
        <p>
          Questions about these terms? Open an issue on{" "}
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          or reach us through the support page in your dashboard.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
