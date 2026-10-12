import { NextResponse } from "next/server";
import { COOLDOWN_DAYS, composeMessage, nextAllowedAt, shortDate, whatsappUrl } from "@/lib/message";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Records one prepared WhatsApp request and hands back the exact link to
// open. The database trigger is the backstop: if two tabs race past the
// checks below, the second insert is refused and we report that plainly.
export async function POST(request: Request) {
  let customerId: unknown;
  try {
    ({ customerId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof customerId !== "string" || !UUID.test(customerId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, opted_out, business_id")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json(
      { error: "We couldn't find that customer." },
      { status: 404 },
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("google_review_link, message_template")
    .eq("id", customer.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    return NextResponse.json(
      { error: "Set up your business first, then try again." },
      { status: 409 },
    );
  }

  if (!customer.phone) {
    return NextResponse.json(
      { error: "Add a phone number for them first." },
      { status: 409 },
    );
  }
  if (customer.opted_out) {
    return NextResponse.json(
      { error: "They've opted out, so you can't send them a review request." },
      { status: 409 },
    );
  }

  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const { data: recent } = await supabase
    .from("messages")
    .select("created_at")
    .eq("customer_id", customer.id)
    .in("status", ["queued", "sending", "sent", "prepared"])
    .gt("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const lastRequest = recent?.[0]?.created_at;
  if (lastRequest) {
    const next = nextAllowedAt(lastRequest);
    return NextResponse.json(
      {
        error: `You asked ${customer.name.split(/\s+/)[0]} on ${shortDate(lastRequest)}. You can ask again on ${shortDate(next)}.`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("messages").insert({
    customer_id: customer.id,
    channel: "whatsapp",
    status: "prepared",
  });
  if (error) {
    const message = String(error.message ?? "");
    if (/opted out/i.test(message)) {
      return NextResponse.json(
        { error: "They've opted out, so you can't send them a review request." },
        { status: 409 },
      );
    }
    if (/30 days/i.test(message)) {
      return NextResponse.json(
        { error: "They were already asked for a review within the last 30 days. Refresh the page to see the date." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't record that. Try again." },
      { status: 500 },
    );
  }

  const text = composeMessage(
    business.message_template,
    customer.name,
    business.google_review_link,
  );

  return NextResponse.json({
    ok: true,
    text,
    url: whatsappUrl(customer.phone, text),
  });
}
