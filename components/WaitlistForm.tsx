"use client";

import { useState } from "react";
import { site } from "@/lib/site";

type Status = "idle" | "pending" | "error" | "done";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("We could not reach the waitlist. Check your connection and try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-4 text-[var(--text)]">
        You are on the list. We will email you when {site.name} launches.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby="waitlist-consent"
          aria-invalid={status === "error"}
          className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
        <button
          type="submit"
          disabled={status === "pending"}
          className="shrink-0 rounded-[12px] bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "pending" ? "Joining…" : "Join the waitlist"}
        </button>
      </div>

      <p id="waitlist-consent" className="mt-3 text-sm text-[var(--text-muted)]">
        We&apos;ll only email you about launch. Unsubscribe any time.
      </p>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-[var(--text)]">
          {message}
        </p>
      )}
    </form>
  );
}