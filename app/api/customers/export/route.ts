import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A cell starting with = + - @ (or tab/CR) becomes a formula the moment Excel
// or Sheets opens the file (OWASP CSV Injection). One apostrophe keeps it text:
// a phone like +447700900123 exports as '+447700900123, so it is never evaluated
// and never silently converted to the number 447700900123.
const FORMULA_CHARS = "=+-@\t\r";

function csvCell(value: string): string {
  const first = value.charAt(0);
  const safe = first && FORMULA_CHARS.includes(first) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

type DbCustomer = {
  name: string;
  phone: string | null;
  email: string | null;
  opted_out: boolean;
  messages: { created_at: string; status: string }[] | null;
};

// Every read below runs as the signed-in owner: the browser sends its session
// cookie, rls-check sends the owner's own JWT. The anon key is the only key
// used here — row-level security is the boundary, never the service role.
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  let supabase: SupabaseClient;
  let ownerId: string;

  if (authorization) {
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }
    ownerId = data.user.id;
  } else {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }
    ownerId = user.id;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json(
      { error: "Set up your business first, then try again." },
      { status: 409 },
    );
  }

  const { data: rows, error } = await supabase
    .from("customers")
    .select("name, phone, email, opted_out, messages(created_at, status)")
    .eq("business_id", business.id);
  if (error) {
    return NextResponse.json(
      { error: "We couldn't build that file. Try again." },
      { status: 500 },
    );
  }

  const customers = ((rows ?? []) as DbCustomer[])
    .map((row) => {
      // Same request semantics as the customers page: a failed send was never
      // a request, so it does not date the last one.
      const requests = (row.messages ?? [])
        .filter((message) => message.status !== "failed")
        .map((message) => message.created_at)
        .sort();
      const lastRequest = requests.length ? requests[requests.length - 1] : null;
      return {
        name: row.name,
        phone: row.phone ?? "",
        email: row.email ?? "",
        optedOut: row.opted_out ? "yes" : "no",
        lastRequest: lastRequest ? lastRequest.slice(0, 10) : "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const header = ["name", "phone", "email", "opted out", "last request date"];
  const lines = [
    header,
    ...customers.map((customer) => [
      customer.name,
      customer.phone,
      customer.email,
      customer.optedOut,
      customer.lastRequest,
    ]),
  ].map((cells) => cells.map(csvCell).join(","));

  // The BOM tells Excel the file is UTF-8, so accented names survive; CRLF
  // keeps rows clean in every spreadsheet app. The date is in the filename.
  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;
  const filename = `customers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
