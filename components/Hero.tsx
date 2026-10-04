export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
      {/* Soft blurred colour shapes so the glass has something to blur. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--primary)] opacity-[0.12] blur-3xl" />
        <div className="absolute right-[12%] top-40 h-56 w-56 rounded-full bg-[var(--accent)] opacity-[0.18] blur-3xl" />
        <div className="absolute left-[10%] top-56 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.10] blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl">
          Every customer asked for a review, right after their visit.
        </h1>
        <p className="mx-auto mt-6 max-w-[62ch] text-lg text-[var(--text-muted)]">
          Add a customer after their appointment and we send them your Google
          review link at the time you choose. No chasing, no awkward asking.
        </p>
      </div>

      {/* One floating glass card over the hero. */}
      <div className="mx-auto mt-12 max-w-sm">
        <div className="glass p-5 text-left">
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            What your customer receives
          </p>
          <p className="mt-3 text-base text-[var(--text)]">
            Thanks for coming in today. If you have a moment, would you leave us
            a Google review?
          </p>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
            Something wrong? Tell us directly.
          </p>
        </div>
      </div>
    </section>
  );
}