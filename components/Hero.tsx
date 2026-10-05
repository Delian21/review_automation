import { BlobDriftVisibility } from "@/components/BlobDriftVisibility";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
      {/* isolate creates a stacking context so the negative z-index on the blob
          layer stays contained here. Without it the -z-10 escaped to the root
          and painted behind the body background, making the blobs invisible. */}
      <BlobDriftVisibility />
      {/* Soft colour shapes plus a faint smoke texture behind the glass card.
          The whole wash fades out before the section ends, so nothing is cut
          off on a hard line. Colours and opacities are per-theme tokens. */}
      <div
        aria-hidden
        className="hero-wash pointer-events-none absolute inset-0 -z-10"
      >
        <div className="blob-drift blob-drift-1 absolute left-[2%] top-[64%] h-64 w-64 rounded-full bg-[var(--blob-sage)] opacity-[var(--blob-sage-o)] blur-3xl" />
        <div className="blob-drift blob-drift-2 absolute right-[4%] top-[58%] h-72 w-72 rounded-full bg-[var(--blob-sand)] opacity-[var(--blob-sand-o)] blur-3xl" />
        <div className="blob-drift blob-drift-3 absolute left-1/2 top-[82%] ml-[-7rem] h-56 w-56 rounded-full bg-[var(--blob-sage)] opacity-[var(--blob-sage-o)] blur-3xl" />

        {/* Centred with margins, not -translate-x-1/2: the drift keyframes own
            `transform`, so a Tailwind translate would be overwritten. */}
        <div className="smoke smoke-1 absolute left-1/2 top-[62%] ml-[-43%] h-[32%] w-[86%] opacity-[var(--smoke-sage-o)]" />
        <div className="smoke smoke-2 absolute left-1/2 top-[68%] ml-[-35%] h-[28%] w-[70%] opacity-[var(--smoke-sand-o)]" />
        <div className="smoke smoke-3 absolute left-1/2 top-[60%] ml-[-29%] h-[24%] w-[58%] opacity-[var(--smoke-sage-o)]" />
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