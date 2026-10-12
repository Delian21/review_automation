"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "signed-out" | "signed-in";

export function Nav() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setState(data.user ? "signed-in" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? "signed-in" : "signed-out");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg)] px-4 pt-4">
      <nav className="glass glass-nav mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[var(--text)]"
        >
          {site.name}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* The waitlist jump-link is the landing page's only entry point to
              the form (the hero has no CTA), so it stays for signed-out visitors. */}
          {state === "signed-out" && (
            <>
              <a
                href="#waitlist"
                className="hidden text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] sm:inline"
              >
                Join the waitlist
              </a>
              <Link
                href="/login"
                className="rounded-[12px] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg)]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-[12px] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-text)] transition-opacity hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          )}

          {state === "signed-in" && (
            <>
              <Link
                href="/customers"
                className="rounded-[12px] px-2 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--bg)] sm:px-3"
              >
                Customers
              </Link>
              <Link
                href="/setup"
                className="rounded-[12px] px-2 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)] sm:px-3"
              >
                Setup
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface)] sm:px-4"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
