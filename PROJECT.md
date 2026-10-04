# PROJECT — Review Request App

Read after VOWS.md, before DESIGN.md. Name is a working title ("ReviewLoop"). Anything not decided here: ask before choosing.

## What it is

A web app that helps small salons, spas, and dental or wellness practices get more Google reviews by automatically asking every customer after their visit.

## Who it's for

Owners of small service businesses in the US, UK, Canada, and Australia. Non-technical, usually on their phone, and busy. Setup must take under 5 minutes.

## The problem

Owners know reviews bring in new customers, but they forget to ask or feel awkward asking. Reviews arrive randomly instead of consistently.

## Core loop (version 1)

1. Owner signs up and adds their business name and Google review link.
2. Owner adds a customer (name plus phone or email) after a visit. Optional: import a CSV.
3. The app sends that customer a short, friendly message with the review link, immediately or after a delay the owner picks (for example 2 hours).
4. Owner sees a simple dashboard: messages sent, links clicked, private feedback received.

## Review flow rules (important)

- Every customer gets the SAME public review link. Do NOT filter or route people by how happy they are. No "happy goes public, unhappy goes private" logic anywhere, in code or copy.
- The message may include a separate optional line ("Something wrong? Tell us directly") linking to a private feedback form. It sits beside the review link and never replaces it.
- Private feedback goes to the owner by email.

## Messaging and compliance rules

- Message templates are editable, with a sensible default.
- Every SMS and email includes an opt-out. Opted-out customers are never messaged again.
- At signup the owner confirms they have permission to contact their customers (checkbox).
- Never send more than one request per customer in 30 days.
- Needed because of US (TCPA) and UK (PECR, GDPR) rules. Do not weaken these to ship faster.

## Out of scope for version 1

Analytics beyond sent and clicked, multi-location, team accounts, AI-written replies, review sites other than Google, native mobile app, payments. Free trial with no billing until there are real users.

## Stack (suggested, confirm with me before installing)

- Next.js with Tailwind
- Supabase: auth and Postgres database, with row-level security on every table from day one
- Resend for email, Twilio for SMS
- Hosting: Netlify or Vercel
- Secrets in server-side environment variables only

## Data model (when the backend starts)

- `businesses`: owner id, name, Google review link, message template, delay setting
- `customers`: business id, name, phone, email, opted_out, created_at
- `messages`: customer id, channel (sms or email), status (queued, sending, sent, failed), send_at, sent_at, clicked_at, unique tracking token
- `feedback`: business id, customer id, text, created_at
- `waitlist`: email, created_at, source

## Sending logic (when the backend starts)

1. Adding a customer inserts a `messages` row with status `queued` and `send_at` set to now plus the delay.
2. A scheduled job runs every few minutes and selects due rows.
3. For each row it checks the customer has not opted out and has not been messaged in the last 30 days.
4. It marks the row `sending` before it sends, so a retry or overlap can never message someone twice.
5. It sends through Resend or Twilio, then marks the row `sent`.
6. The message contains our own tracking link (`/r/<token>`). A tap records `clicked_at`, then redirects to the Google review link.

## Pages

- Landing page: headline, how it works in 3 steps, pricing, start trial or join waitlist
- Sign up and log in
- Setup: business name, review link, message template, delay
- Customers: add one, import CSV
- Dashboard: sent, clicked, private feedback
- Public, no login: opt-out page, private feedback page, tracking redirect

## Build order

Stop and show me after each phase. Wait for approval before starting the next.

- **Phase 1: Landing page and waitlist.** Real landing page following DESIGN.md. Waitlist form posts to a real destination (Tally, Formspree, or our own database if the backend already exists). No fake data screens.
- **Phase 2: Auth, database, and setup.** Supabase project, tables above, row-level security, signup and login, setup page.
- **Phase 3: Customers and first send.** Add customer and CSV import. Send ONE real email through Resend, triggered manually.
- **Phase 4: Scheduling and SMS.** Scheduled sending, delay setting, 30-day limit, opt-out, Twilio. (Twilio sender registration for US and UK takes time. Start early, or launch email-only first.)
- **Phase 5: Dashboard and feedback.** Tracking redirect, click counts, private feedback page and email.
- **Phase 6: Polish and launch.** Contrast and mobile checks, error states, privacy policy and terms pages.

If I decide to start the backend earlier, Phase 1 and Phase 2 can be swapped or merged. Ask me before reordering.

## Done means

One real business can sign up, add a customer, and that customer receives a message with a working review link. Opt-out works, and the owner sees the click.

## Open questions for the agent to ask me

- Final product name and domain
- Pricing and trial length for the landing page
- Email-only or email plus SMS at launch
- Whether the Google review link is entered manually or looked up from the business name
