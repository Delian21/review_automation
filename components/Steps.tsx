const STEPS = [
  {
    title: "Add your business",
    body: "Enter your business name and your Google review link. That is the only setup.",
  },
  {
    title: "Add each customer",
    body: "After a visit, add a name and a phone or email. Import a CSV if you already have a list.",
  },
  {
    title: "We send the request",
    body: "Immediately, or after a delay you pick. Every customer gets the same review link.",
  },
];

export function Steps() {
  return (
    <section className="px-4 py-20" id="how-it-works">
      <h2 className="text-center text-3xl">How it works</h2>
      <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <span className="text-sm font-semibold text-[var(--primary)]">
              Step {index + 1}
            </span>
            <h3 className="mt-2 text-xl">{step.title}</h3>
            <p className="mt-3 text-[var(--text-muted)]">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}