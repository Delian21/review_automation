"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage(authErrorMessage(error));
      return;
    }

    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/setup");
    router.refresh();
  }

  return (
    <div className={cardClass}>
      <h1 className="text-2xl">Log in</h1>
      <p className={`${mutedClass} mt-2`}>Welcome back. Enter your details below.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email address
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClass} mt-2`}
          />
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
          {status === "pending" ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className={`${mutedClass} mt-6`}>
        New here?{" "}
        <Link href="/signup" className="font-semibold text-[var(--primary)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
