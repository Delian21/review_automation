"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";
import {
  cardClass,
  errorClass,
  inputClass,
  labelClass,
  mutedClass,
  primaryButtonClass,
} from "@/lib/forms";

type Status = "idle" | "pending" | "error";

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consent) {
      setStatus("error");
      setMessage("Tick the box to confirm you can contact your customers.");
      return;
    }

    setStatus("pending");
    setMessage("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus("error");
      setMessage(authErrorMessage(error));
      return;
    }

    // Email confirmation is off for the trial, so we have a session now.
    router.push("/setup");
    router.refresh();
  }

  return (
    <div className={cardClass}>
      <h1 className="text-2xl">Create your account</h1>
      <p className={`${mutedClass} mt-2`}>
        Set up your business and start asking for reviews in under five minutes.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="signup-email" className={labelClass}>
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className={labelClass}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="signup-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
          />
          <label htmlFor="signup-consent" className="text-sm text-[var(--text)]">
            I have permission to contact my customers about their visit.
          </label>
        </div>

        {status === "error" && (
          <p role="alert" className={errorClass}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "pending"}
          className={primaryButtonClass}
        >
          {status === "pending" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className={`${mutedClass} mt-6`}>
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)]">
          Log in
        </Link>
      </p>
    </div>
  );
}
