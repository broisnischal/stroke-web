import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalList, LegalPage, LegalSection } from "#/components/legal";
import { REPO_URL } from "#/components/site-chrome";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seo({
      title: "Privacy Policy · Stroke",
      description:
        "What Stroke collects, what it doesn't, and how your data is handled, including the guarantee that your database credentials never leave your device.",
      path: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 17, 2026"
      intro="Stroke is built on a simple boundary: the desktop app works with your databases on your machine, and our servers only handle accounts and licenses. This policy describes what crosses that boundary, what never does, and what your choices are."
    >
      <LegalSection number="01" title="The short version">
        <LegalList
          items={[
            <>
              Your <strong>database credentials, queries, and data never leave your device</strong>.
              Stroke connects to your databases directly; nothing is proxied through our servers.
            </>,
            <>
              We only hold personal data if you create an account to buy a license: your name,
              email, and license records.
            </>,
            "We don't run ads and we never sell data. The website uses privacy-friendly analytics only if you opt in through the cookie banner.",
          ]}
        />
      </LegalSection>

      <LegalSection number="02" title="What the desktop app stores locally">
        <p>
          Connection details (hosts, ports, usernames, passwords, file paths, API tokens), saved
          queries, dashboards, and preferences are stored locally on your device. They are read by
          the app to do its job and are never uploaded to us. If you use the built-in AI chat or MCP
          server with a third-party AI client, data flows directly between your machine and the
          provider you configured, under that provider's terms, not ours.
        </p>
      </LegalSection>

      <LegalSection number="03" title="What we collect if you create an account">
        <p>
          Accounts exist only for licensing. When you sign in with GitHub or Google, we receive and
          store:
        </p>
        <LegalList
          items={[
            "Your name, email address, and avatar from the provider you chose. We never see your password.",
            "Session data (a cookie that keeps you signed in, plus IP address and user agent for session security).",
            <>
              <strong>License records</strong>: your license key, plan, and (when you activate the
              app on a device) a device identifier and hostname, used to enforce the 2-device limit
              and to let you deactivate devices from your dashboard.
            </>,
            <>
              <strong>Payment records</strong>: the status and amount of payments, kept for
              accounting. Checkout happens on Dodo Payments; card details never touch our servers.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection number="04" title="What we don't collect">
        <LegalList
          items={[
            "No database credentials, schemas, queries, or query results.",
            "No usage analytics or telemetry from the desktop app.",
            "No advertising identifiers, and no sale or sharing of personal data for marketing.",
          ]}
        />
      </LegalSection>

      <LegalSection number="05" title="Cookies">
        <p>
          Two functional cookies are always on: one to keep you signed in and one to remember your
          light/dark theme preference. These are essential to the site and don't require consent.
        </p>
        <p>
          Beyond those, we use privacy-friendly product analytics (PostHog) to understand which
          pages are useful, but only after you accept through the cookie banner. If you decline, no
          analytics cookies are set and nothing is tracked; the site works exactly the same either
          way. Your choice is remembered locally, and you can change it by clearing this site's
          storage. We never use advertising cookies.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Services we rely on">
        <p>A small number of providers process data on our behalf:</p>
        <LegalList
          items={[
            <>
              <strong>Cloudflare</strong> hosts the website, database, and licensing API. Requests
              to stroke.click pass through Cloudflare's network.
            </>,
            <>
              <strong>Dodo Payments</strong> processes checkout as merchant of record and handles
              billing details under its own privacy policy.
            </>,
            <>
              <strong>GitHub and Google</strong> provide sign-in. Downloads are served from GitHub
              Releases, so fetching an installer is a request to GitHub, not to us.
            </>,
            <>
              <strong>PostHog</strong> provides privacy-friendly website analytics, loaded through a
              same-origin proxy and only after you opt in. It never receives your database data.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection number="07" title="How long we keep data">
        <p>
          Account, license, and payment records are kept while your account exists, and payment
          records as long as accounting rules require. Device activations are removed when you
          deactivate a device. If you delete your account, we delete your personal data, keeping
          only what payment regulations oblige us to retain.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Your rights">
        <p>
          You can access and update your account details from your dashboard. You may request a copy
          of your data, correction, or deletion at any time. Depending on where you live, laws like
          the GDPR or CCPA give you these rights formally, but we honor them for everyone. Contact
          us and we'll handle it.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Changes to this policy">
        <p>
          If we ever change what we collect, for example by adding opt-in crash reporting to the
          app, we will update this page, change the date at the top, and call out the change in the
          release notes before it ships.
        </p>
      </LegalSection>

      <LegalSection number="10" title="Contact">
        <p>
          Privacy questions or requests? Open an issue on{" "}
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          or reach us through the support page in your dashboard. The terms that govern the service
          are in the <Link to="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
