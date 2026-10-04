import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const formId = process.env.FORMSPREE_FORM_ID;
  if (!formId) {
    return NextResponse.json(
      { error: "The waitlist is not configured yet." },
      { status: 500 },
    );
  }

  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`https://formspree.io/f/${formId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "We could not save that. Try again in a moment." },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "We could not reach the waitlist. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}