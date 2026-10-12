"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  errorClass,
  inputClass,
  labelClass,
  mutedClass,
  primaryButtonClass,
} from "@/lib/forms";
import { saveErrorMessage, validateCustomer, type CustomerErrors } from "@/lib/customer";

type Props = {
  businessId: string;
};

const EMPTY = { name: "", phone: "", email: "" };

export function AddCustomerForm({ businessId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [message, setMessage] = useState("");

  function update(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const result = validateCustomer(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setStatus("pending");
    const { error } = await supabase.from("customers").insert({
      business_id: businessId,
      name: result.value.name,
      phone: result.value.phone,
      email: result.value.email,
    });

    if (error) {
      setStatus("idle");
      setMessage(saveErrorMessage(error));
      return;
    }

    setForm(EMPTY);
    setErrors({});
    setStatus("saved");
    setMessage(`Added ${result.value.name}.`);
    router.refresh();
    nameRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"
    >
      <h2 className="text-xl">Add a customer</h2>
      <p className={`${mutedClass} mt-1`}>
        One visit at a time. Name and phone, email only if you have it.
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="customer-name" className={labelClass}>
            Name
          </label>
          <input
            id="customer-name"
            ref={nameRef}
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. Priya Patel"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            className={`${inputClass} mt-2`}
          />
          {errors.name && (
            <p role="alert" className={`${mutedClass} mt-2`}>
              {errors.name}
            </p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="customer-phone" className={labelClass}>
            Phone
          </label>
          <input
            id="customer-phone"
            type="tel"
            required
            autoComplete="off"
            inputMode="tel"
            placeholder="07700 900123"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            className={`${inputClass} mt-2`}
          />
          {errors.phone && (
            <p role="alert" className={`${mutedClass} mt-2`}>
              {errors.phone}
            </p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="customer-email" className={labelClass}>
            Email <span className={mutedClass}>(optional)</span>
          </label>
          <input
            id="customer-email"
            type="email"
            autoComplete="off"
            placeholder="priya@example.com"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            className={`${inputClass} mt-2`}
          />
          {errors.email && (
            <p role="alert" className={`${mutedClass} mt-2`}>
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {message && (
        <p role={status === "saved" ? "status" : "alert"} className={`${errorClass} mt-5`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "pending"}
        className={`${primaryButtonClass} mt-5 sm:w-auto sm:px-8`}
      >
        {status === "pending" ? "Adding…" : "Add customer"}
      </button>
    </form>
  );
}
