"use client";

import { useState } from "react";
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
  textareaClass,
} from "@/lib/forms";

export const DEFAULT_TEMPLATE =
  "Thanks for coming in today. If you have a moment, would you leave us a Google review? It really helps us out. {review_link}";

type Status = "idle" | "pending" | "saved" | "error";

type Props = {
  ownerId: string;
  initial: {
    name: string;
    googleReviewLink: string;
    messageTemplate: string;
  } | null;
};

export function SetupForm({ ownerId, initial }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [reviewLink, setReviewLink] = useState(initial?.googleReviewLink ?? "");
  const [template, setTemplate] = useState(
    initial?.messageTemplate ?? DEFAULT_TEMPLATE,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("pending");
    setMessage("");

    const { error } = await supabase.from("businesses").upsert(
      {
        owner_id: ownerId,
        name: name.trim(),
        google_review_link: reviewLink.trim(),
        message_template: template.trim(),
      },
      { onConflict: "owner_id" },
    );

    if (error) {
      setStatus("error");
      setMessage(authErrorMessage(error));
      return;
    }

    setStatus("saved");
    setMessage("Saved. Your setup is ready.");
    router.refresh();
  }

  return (
    <div className="w-full max-w-xl rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
      <h1 className="text-2xl">Set up your business</h1>
      <p className={`${mutedClass} mt-2`}>
        Three details and you&apos;re ready. You can change these any time.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="business-name" className={labelClass}>
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            required
            autoComplete="organization"
            placeholder="e.g. Riverside Hair Studio"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="review-link" className={labelClass}>
            Google review link
          </label>
          <input
            id="review-link"
            type="url"
            required
            placeholder="https://g.page/r/…/review"
            value={reviewLink}
            onChange={(event) => setReviewLink(event.target.value)}
            className={`${inputClass} mt-2`}
          />
          <p className={`${mutedClass} mt-2`}>
            The link customers open to leave you a review on Google.
          </p>
        </div>

        <div>
          <label htmlFor="template" className={labelClass}>
            Message template
          </label>
          <textarea
            id="template"
            required
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
            className={`${textareaClass} mt-2`}
          />
          <p className={`${mutedClass} mt-2`}>
            Use{" "}
            <code className="rounded-[12px] bg-[var(--bg)] px-1.5 py-0.5">
              {"{review_link}"}
            </code>{" "}
            where the Google link should go. Every customer gets the same link.
          </p>
        </div>

        {status === "error" && (
          <p role="alert" className={errorClass}>
            {message}
          </p>
        )}

        {status === "saved" && (
          <p role="status" className={`${errorClass} border-l-[var(--primary)]`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "pending"}
          className={primaryButtonClass}
        >
          {status === "pending" ? "Saving…" : "Save setup"}
        </button>
      </form>
    </div>
  );
}
