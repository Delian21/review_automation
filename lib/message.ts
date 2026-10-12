import { phoneDigits } from "@/lib/phone";

// One request per customer per 30 days. Shared by the page (to disable the
// button and say why), the API route (to refuse), and mirrored by the
// database trigger in supabase/migrations/0002_phase3_customers.sql.
export const COOLDOWN_DAYS = 30;

// Statuses that count as a request. Must stay in step with that trigger.
export const REQUEST_STATUSES = ["queued", "sending", "sent", "prepared"];

// The app owns this line so it cannot be forgotten in an editable template.
export const OPT_OUT_LINE =
  "If you'd rather not get these, just reply STOP and we won't message you again.";

export function firstName(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/);
  return parts[0] || (name ?? "").trim();
}

export function composeMessage(
  template: string,
  customerName: string,
  reviewLink: string,
): string {
  const first = firstName(customerName);
  let text = (template ?? "")
    .replace(/\{customer_name\}/g, first)
    .replace(/\{review_link\}/g, reviewLink)
    .trim();

  // Every customer gets the same public review link, even if the owner
  // edited the token out of their template.
  if (reviewLink && !text.includes(reviewLink)) {
    text = text ? `${text}\n${reviewLink}` : reviewLink;
  }
  if (!/reply STOP/i.test(text)) {
    text = text ? `${text}\n\n${OPT_OUT_LINE}` : OPT_OUT_LINE;
  }
  return text;
}

export function whatsappUrl(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneDigits(phoneE164)}?text=${encodeURIComponent(text)}`;
}

// Pinned locale so server and browser format the same date string.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function shortDate(value: string | Date): string {
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}

export function nextAllowedAt(lastRequestedAt: string): Date {
  const date = new Date(lastRequestedAt);
  return new Date(date.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}
