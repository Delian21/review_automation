// Phone handling: everything is stored as E.164 (+447700900123) so the
// WhatsApp link, the duplicate check, and the database index all compare
// like with like. Default country is the UK; other countries type +.

export type PhoneResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const HINT = "Use a UK number like 07700 900123, or any number with + in front.";

export function normalizePhone(input: string): PhoneResult {
  // Strips the punctuation real exports carry: spaces, NBSP (\s covers it),
  // brackets, slashes, and the ASCII/Unicode dashes Excel likes to swap in.
  const cleaned = (input ?? "").replace(/[\s().\-/\u2010-\u2015\u2212]/g, "");
  if (!cleaned) {
    return { ok: false, error: "Enter a phone number." };
  }
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { ok: false, error: `That doesn't look like a phone number. ${HINT}` };
  }

  let digits: string;
  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    digits = `44${cleaned.slice(1)}`;
  } else if (cleaned.length >= 9 && cleaned.length <= 10) {
    // A bare number with no trunk zero is assumed to be a UK number with the
    // zero dropped. UK national numbers are 9-10 digits, which is also the
    // only shape that can be guessed safely.
    digits = `44${cleaned}`;
  } else if (cleaned.length > 10) {
    // Too long to be a UK national number, so this is an international
    // number typed without its +. Prefixing 44 would silently corrupt it,
    // so make the owner say which it is.
    return {
      ok: false,
      error: `That looks too long to be a UK number. If it's from another country, put + in front.`,
    };
  } else {
    return { ok: false, error: `That phone number looks too short. ${HINT}` };
  }

  // "+44 (0)7700…" — a trunk zero written straight after the country code is
  // a directory convention, not part of the number. Only reachable from an
  // explicitly dialled +44/0044, and UK national numbers never start with 0,
  // so dropping it is safe. (No country code begins 440, so this can't
  // misfire on another country.)
  if (digits.startsWith("440")) {
    digits = `44${digits.slice(3)}`;
  }

  if (!/^[1-9][0-9]{6,14}$/.test(digits)) {
    return { ok: false, error: `That phone number looks too short or too long. ${HINT}` };
  }
  return { ok: true, value: `+${digits}` };
}

// WhatsApp's wa.me links take digits only: no +, no 00, no trunk zero.
export function phoneDigits(e164: string): string {
  return e164.replace(/^\+/, "");
}

// Groups the default country's numbers so the list reads like a phone book.
export function formatPhone(e164: string): string {
  if (e164.startsWith("+44") && e164.length > 7) {
    const rest = e164.slice(3);
    return `+44 ${rest.slice(0, 4)} ${rest.slice(4)}`;
  }
  return e164;
}
