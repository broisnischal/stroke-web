# Security policy

## Reporting a vulnerability

**Please do not open a public issue.** This service issues and validates Stroke
licences, handles payments, and proxies AI requests, so a public report is a
working exploit until it is patched.

Report privately through
[GitHub Security Advisories](https://github.com/broisnischal/stroke-web/security/advisories/new),
or email **nischaldahal01395@gmail.com**. You will get a first response within 72
hours.

## Particularly interested in

- Licence forgery, or activating Pro without a valid purchase
- Reading another account's licences, payments, or subscription state
- Bypassing the free AI tier's quota, or reaching the AI proxy without a valid
  device token
- Anything that exposes `LICENSE_ADMIN_SECRET`, `OPENROUTER_POOL_KEY`,
  `ANON_TOKEN_SECRET`, or a payment webhook secret
- Reaching an `/api/admin/*` route without the admin secret

## Not in scope

- Rate limits on public endpoints being reachable by design
- Missing headers with no demonstrated impact
- Reports produced solely by an automated scanner, with no exploit path

## What is stored

Anonymous device identifiers, licence records, payment references from the
payment provider, and aggregate usage counters. No database credentials, no
query text, and nothing about the data Stroke users browse — the desktop app has
no code path that would send it.
