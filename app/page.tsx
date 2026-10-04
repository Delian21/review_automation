import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Steps } from "@/components/Steps";
import { WaitlistForm } from "@/components/WaitlistForm";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Steps />

        <section id="waitlist" className="px-4 pb-24">
          <div className="mx-auto max-w-xl rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
            <h2 className="text-2xl">Get {site.name} when it launches</h2>
            <div className="mt-6">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>{site.name}</span>
          <span>Not affiliated with Google.</span>
        </div>
      </footer>
    </>
  );
}