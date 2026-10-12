import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { mutedClass } from "@/lib/forms";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
};

// PROJECT.md requires a basic privacy notice before any real owner enters
// real customer data. Short, plain, and honest about what this version does.
export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="px-4 py-12">
        <article className="mx-auto max-w-[62ch]">
          <h1 className="text-3xl">Privacy</h1>
          <p className={`${mutedClass} mt-3`}>
            What {site.name} stores, why, and what we never do with it. Written
            for the people whose details end up here, not just for lawyers.
          </p>

          <section className="mt-8">
            <h2 className="text-xl">What we store</h2>
            <p className="mt-2">
              The business owner who signs up gives us their email address, their
              business name, their Google review link, and the message they want
              to send. For each customer they add, we store a name, a phone
              number, an email address if they have one, whether they have opted
              out, and when a review request was prepared for them.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Why we store it</h2>
            <p className="mt-2">
              So the owner can send a short review request after a visit, and so
              we can respect two rules: nobody is asked who has opted out, and
              nobody is asked more than once every 30 days. That is all it is
              used for.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">What we never do</h2>
            <ul className="mt-2 list-disc pl-5">
              <li>
                We do not send messages for anyone. The owner opens WhatsApp,
                reads the message, and presses send themselves.
              </li>
              <li>We do not track whether a link was opened or clicked.</li>
              <li>We do not sell data, and we do not share it with advertisers.</li>
              <li>We do not ask customers for anything beyond their name and contact details.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Opting out</h2>
            <p className="mt-2">
              Every message includes a line asking the customer to reply STOP.
              The owner marks anyone who asks as opted out, and that person is
              never asked again. A customer can also ask the owner directly to be
              removed.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Getting your data removed</h2>
            <p className="mt-2">
              Customer records belong to the business that added them. Ask that
              business to delete you, and deleting a customer removes their
              details and their message history from {site.name}.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl">Where it lives</h2>
            <p className="mt-2">
              Data is stored in our database with Supabase, and the app is hosted
              for us. We keep it for as long as the business has an account.
              {site.name} is in a private beta, so this notice may change as the
              product does — the current version will always be on this page.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8">
        <div className="mx-auto flex max-w-3xl gap-4 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text)]">
            Back to {site.name}
          </Link>
        </div>
      </footer>
    </>
  );
}
