import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddCustomerForm } from "@/components/AddCustomerForm";
import { CustomerList, type CustomerRow } from "@/components/CustomerList";
import { CsvImport } from "@/components/CsvImport";
import { Nav } from "@/components/Nav";
import { mutedClass } from "@/lib/forms";
import { COOLDOWN_DAYS, nextAllowedAt, shortDate } from "@/lib/message";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Customers",
};

type DbCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  opted_out: boolean;
  created_at: string;
  messages: { created_at: string; status: string }[];
};

// The block reason is computed here, on the server, so the disabled button
// and its explanation are already correct in the first painted HTML.
function blockReason(customer: {
  phone: string | null;
  optedOut: boolean;
  lastRequestedAt: string | null;
}): string | null {
  if (customer.optedOut) {
    return "They've opted out, so you can't send them a review request.";
  }
  if (!customer.phone) {
    return "No phone number saved. Add one to send on WhatsApp.";
  }
  if (customer.lastRequestedAt) {
    const next = nextAllowedAt(customer.lastRequestedAt);
    if (next.getTime() > Date.now()) {
      return `You asked on ${shortDate(customer.lastRequestedAt)}. You can ask again on ${shortDate(next)}.`;
    }
  }
  return null;
}

export default async function CustomersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this; this is a defence-in-depth re-check.
  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, google_review_link, message_template")
    .eq("owner_id", user.id)
    .maybeSingle();

  // No business yet means no review link to send, so setup comes first.
  if (!business) {
    redirect("/setup");
  }

  const { data: rows } = await supabase
    .from("customers")
    .select("id, name, phone, email, opted_out, created_at, messages(created_at, status)")
    .eq("business_id", business.id);

  const customers: CustomerRow[] = ((rows ?? []) as DbCustomer[])
    .map((row) => {
      const requests = (row.messages ?? [])
        .filter((message) => message.status !== "failed")
        .map((message) => message.created_at)
        .sort();
      const lastRequestedAt = requests.length
        ? requests[requests.length - 1]
        : null;
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        optedOut: row.opted_out,
        lastRequestedAt,
        blockReason: blockReason({ phone: row.phone, optedOut: row.opted_out, lastRequestedAt }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  return (
    <>
      <Nav />
      <main className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl">Customers</h1>
          <p className={`${mutedClass} mt-2`}>
            {customers.length === 1
              ? "1 customer on your list."
              : `${customers.length} customers on your list.`}{" "}
            Add them after their visit, then send your review request on WhatsApp.
          </p>

          <div className="mt-8 flex flex-col gap-6">
            <AddCustomerForm businessId={business.id} />
            <CsvImport
              businessId={business.id}
              existingPhones={(customers ?? [])
                .map((customer) => customer.phone)
                .filter((phone): phone is string => Boolean(phone))}
            />
            <CustomerList
              business={{
                messageTemplate: business.message_template,
                googleReviewLink: business.google_review_link,
              }}
              customers={customers}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8">
        <div className="mx-auto flex max-w-3xl gap-4 text-sm text-[var(--text-muted)]">
          <span>{site.name}</span>
          <Link href="/privacy" className="hover:text-[var(--text)]">
            Privacy
          </Link>
          <span>One review request per customer every {COOLDOWN_DAYS} days.</span>
        </div>
      </footer>
    </>
  );
}
