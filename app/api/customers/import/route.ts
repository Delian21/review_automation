import { NextResponse } from "next/server";
import { MAX_IMPORT_ROWS } from "@/lib/csv";
import { validateCustomer } from "@/lib/customer";
import { createClient } from "@/lib/supabase/server";

type ImportRow = {
  row: number;
  name: string;
  phone: string;
  email?: string;
};

// Imports the rows the browser already previewed, but re-checks every one of
// them here: the preview is convenience, this is the decision.
export async function POST(request: Request) {
  let rows: unknown;
  try {
    ({ rows } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Nothing to import." }, { status: 400 });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `That's more than ${MAX_IMPORT_ROWS} rows. Split the file and import in parts.` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) {
    return NextResponse.json(
      { error: "Set up your business first, then try again." },
      { status: 409 },
    );
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("phone")
    .eq("business_id", business.id);

  const known = new Set(
    ((existing ?? []) as { phone: string | null }[])
      .map((row) => row.phone)
      .filter((phone): phone is string => Boolean(phone))
      .map((phone) => phone.replace(/^\+/, "")),
  );

  const skipped: { row: number; reason: string }[] = [];
  const valid: { row: number; name: string; phone: string; email: string | null }[] = [];
  const seen = new Map<string, number>();

  for (const raw of rows) {
    const row = typeof raw?.row === "number" ? raw.row : 0;
    const result = validateCustomer({
      name: typeof raw?.name === "string" ? raw.name : "",
      phone: typeof raw?.phone === "string" ? raw.phone : "",
      email: typeof raw?.email === "string" ? raw.email : "",
    });
    if (!result.ok) {
      skipped.push({
        row,
        reason: result.errors.name ?? result.errors.phone ?? result.errors.email ?? "Not valid",
      });
      continue;
    }

    const digits = result.value.phone.replace(/^\+/, "");
    const firstSeen = seen.get(digits);
    if (firstSeen !== undefined) {
      skipped.push({ row, reason: `Same number as row ${firstSeen}` });
      continue;
    }
    if (known.has(digits)) {
      skipped.push({ row, reason: "Already on your list" });
      continue;
    }
    seen.set(digits, row);
    valid.push({ row, ...result.value });
  }

  let imported = 0;

  if (valid.length > 0) {
    const { error } = await supabase.from("customers").insert(
      valid.map((row) => ({
        business_id: business.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
      })),
    );

    if (!error) {
      imported = valid.length;
    } else if (error.code === "23505") {
      // A number slipped in between our check and the insert: fall back to
      // one row at a time so the owner learns exactly which rows that was.
      for (const row of valid) {
        const { error: rowError } = await supabase.from("customers").insert({
          business_id: business.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
        });
        if (rowError) {
          skipped.push({
            row: row.row,
            reason:
              rowError.code === "23505" ? "Already on your list" : "We couldn't save that row",
          });
        } else {
          imported += 1;
        }
      }
    } else {
      return NextResponse.json(
        { error: "We couldn't import that file. Try again." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ imported, skipped });
}
