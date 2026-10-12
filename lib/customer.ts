import { normalizePhone } from "@/lib/phone";

// Shared by the add form, the CSV import, and the API routes, so a row is
// judged by the same rules no matter which door it comes through.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CustomerInput = {
  name: string;
  phone: string;
  email?: string;
};

export type CustomerValue = {
  name: string;
  phone: string;
  email: string | null;
};

export type CustomerErrors = {
  name?: string;
  phone?: string;
  email?: string;
};

export type CustomerValidation =
  | { ok: true; value: CustomerValue }
  | { ok: false; errors: CustomerErrors };

export function validateCustomer(input: CustomerInput): CustomerValidation {
  const errors: CustomerErrors = {};

  const name = (input.name ?? "").trim();
  if (!name) {
    errors.name = "Enter the customer's name.";
  } else if (name.length > 120) {
    errors.name = "That name is too long. Keep it under 120 characters.";
  }

  const phoneResult = normalizePhone(input.phone ?? "");
  if (!phoneResult.ok) {
    errors.phone = phoneResult.error;
  }

  const email = (input.email ?? "").trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = "That doesn't look like an email address.";
  } else if (email.length > 254) {
    errors.email = "That email address is too long.";
  }

  // The !phoneResult.ok arm is in the guard so the value below is narrowed.
  if (errors.name || errors.phone || errors.email || !phoneResult.ok) {
    return { ok: false, errors };
  }
  return { ok: true, value: { name, phone: phoneResult.value, email: email || null } };
}

// Plain copy for database errors, so the forms never leak Postgres text.
export function saveErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : String(error ?? "");

  if (code === "23505" || /duplicate key|unique constraint/i.test(message)) {
    return "That phone number is already on your list.";
  }
  if (/opted out/i.test(message)) {
    return "They've opted out, so you can't send them a review request.";
  }
  if (/30 days/i.test(message)) {
    return "They were already asked for a review within the last 30 days.";
  }
  return "We couldn't save that. Try again.";
}
