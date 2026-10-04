import { site } from "@/lib/site";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav className="glass glass-nav mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <span className="text-lg font-semibold tracking-tight">
          {site.name}
        </span>
        <a
          href="#waitlist"
          className="rounded-[12px] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-text)] transition-opacity hover:opacity-90"
        >
          Join the waitlist
        </a>
      </nav>
    </header>
  );
}