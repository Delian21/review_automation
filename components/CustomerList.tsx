"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  saveErrorMessage,
  validateCustomer,
  type CustomerErrors,
} from "@/lib/customer";
import {
  badgeClass,
  errorClass,
  inputClass,
  labelClass,
  mutedClass,
  secondaryButtonClass,
  smallPrimaryButtonClass,
} from "@/lib/forms";
import { composeMessage, whatsappUrl } from "@/lib/message";
import { formatPhone } from "@/lib/phone";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  optedOut: boolean;
  lastRequestedAt: string | null;
  blockReason: string | null;
};

type Props = {
  business: {
    messageTemplate: string;
    googleReviewLink: string;
  };
  customers: CustomerRow[];
};

export function CustomerList({ business, customers }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [editErrors, setEditErrors] = useState<CustomerErrors>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});

  function setNotice(id: string, text: string) {
    setNotices((current) => ({ ...current, [id]: text }));
  }

  function clearNotice(id: string) {
    setNotices((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function startEdit(customer: CustomerRow) {
    clearNotice(customer.id);
    setEditingId(customer.id);
    setEditErrors({});
    setEditForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
    });
  }

  async function saveEdit(customer: CustomerRow) {
    const result = validateCustomer(editForm);
    if (!result.ok) {
      setEditErrors(result.errors);
      return;
    }

    setBusyId(customer.id);
    const { error } = await supabase
      .from("customers")
      .update({
        name: result.value.name,
        phone: result.value.phone,
        email: result.value.email,
      })
      .eq("id", customer.id);
    setBusyId(null);

    if (error) {
      setEditErrors({});
      setNotice(customer.id, saveErrorMessage(error));
      return;
    }

    setEditingId(null);
    setNotice(customer.id, "Saved.");
    router.refresh();
  }

  async function toggleOptedOut(customer: CustomerRow) {
    setBusyId(customer.id);
    const { error } = await supabase
      .from("customers")
      .update({ opted_out: !customer.optedOut })
      .eq("id", customer.id);
    setBusyId(null);

    if (error) {
      setNotice(customer.id, saveErrorMessage(error));
      return;
    }

    setNotice(
      customer.id,
      customer.optedOut
        ? "They're no longer marked as opted out."
        : "Marked as opted out. You can't send them a review request.",
    );
    router.refresh();
  }

  async function removeCustomer(customer: CustomerRow) {
    setBusyId(customer.id);
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);
    setBusyId(null);
    setConfirmId(null);

    if (error) {
      setNotice(customer.id, saveErrorMessage(error));
      return;
    }
    router.refresh();
  }

  async function handleSend(customer: CustomerRow) {
    if (customer.blockReason) return;

    clearNotice(customer.id);
    setBusyId(customer.id);

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id }),
    }).catch(() => null);

    setBusyId(null);

    if (!response || !response.ok) {
      const data = await response?.json().catch(() => null);
      setNotice(
        customer.id,
        data?.error ?? "We couldn't record that. Try again.",
      );
      router.refresh();
      return;
    }

    const data = (await response.json()) as { url: string };
    // Only open WhatsApp once the request is recorded, so the 30-day rule
    // can never be lost. Popup blockers fall back to the same tab.
    const popup = window.open("", "_blank");
    if (popup) {
      popup.location.href = data.url;
    } else {
      window.location.assign(data.url);
    }
    setNotice(customer.id, "Opened WhatsApp. Press send there to finish.");
    router.refresh();
  }

  if (customers.length === 0) {
    return (
      <p className={`${mutedClass} rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8`}>
        No customers yet. Add one after a visit, or import a list from a CSV.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {customers.map((customer) => {
        const preview = composeMessage(
          business.messageTemplate,
          customer.name,
          business.googleReviewLink,
        );
        const notice = notices[customer.id];
        const sending = busyId === customer.id;

        return (
          <li
            key={customer.id}
            className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            {editingId === customer.id ? (
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <label htmlFor={`edit-name-${customer.id}`} className={labelClass}>
                      Name
                    </label>
                    <input
                      id={`edit-name-${customer.id}`}
                      type="text"
                      value={editForm.name}
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, name: event.target.value }));
                        setEditErrors((current) => ({ ...current, name: undefined }));
                      }}
                      aria-invalid={Boolean(editErrors.name)}
                      className={`${inputClass} mt-2`}
                    />
                    {editErrors.name && (
                      <p role="alert" className={`${mutedClass} mt-2`}>
                        {editErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-phone-${customer.id}`} className={labelClass}>
                      Phone
                    </label>
                    <input
                      id={`edit-phone-${customer.id}`}
                      type="tel"
                      inputMode="tel"
                      value={editForm.phone}
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, phone: event.target.value }));
                        setEditErrors((current) => ({ ...current, phone: undefined }));
                      }}
                      aria-invalid={Boolean(editErrors.phone)}
                      className={`${inputClass} mt-2`}
                    />
                    {editErrors.phone && (
                      <p role="alert" className={`${mutedClass} mt-2`}>
                        {editErrors.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`edit-email-${customer.id}`} className={labelClass}>
                      Email <span className={mutedClass}>(optional)</span>
                    </label>
                    <input
                      id={`edit-email-${customer.id}`}
                      type="email"
                      value={editForm.email}
                      onChange={(event) => {
                        setEditForm((current) => ({ ...current, email: event.target.value }));
                        setEditErrors((current) => ({ ...current, email: undefined }));
                      }}
                      aria-invalid={Boolean(editErrors.email)}
                      className={`${inputClass} mt-2`}
                    />
                    {editErrors.email && (
                      <p role="alert" className={`${mutedClass} mt-2`}>
                        {editErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {notice && (
                  <p role="alert" className={`${errorClass} mt-4`}>
                    {notice}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(customer)}
                    disabled={sending}
                    className={smallPrimaryButtonClass}
                  >
                    {sending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      clearNotice(customer.id);
                    }}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className={mutedClass}>
                      {customer.phone ? formatPhone(customer.phone) : "No phone number"}
                      {customer.email ? ` · ${customer.email}` : ""}
                    </p>
                  </div>
                  {customer.optedOut && (
                    <span className={badgeClass}>Opted out</span>
                  )}
                </div>

                {customer.blockReason && (
                  <p className={`${mutedClass} mt-3`}>{customer.blockReason}</p>
                )}

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
                    Preview message
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-4 text-sm">
                    {preview}
                  </p>
                </details>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSend(customer)}
                    disabled={Boolean(customer.blockReason) || sending}
                    className={smallPrimaryButtonClass}
                  >
                    {sending ? "Opening…" : "Send on WhatsApp"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(customer)}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOptedOut(customer)}
                    disabled={sending}
                    className={secondaryButtonClass}
                  >
                    {customer.optedOut ? "Undo opt-out" : "Mark as opted out"}
                  </button>
                  {confirmId === customer.id ? (
                    <button
                      type="button"
                      onClick={() => removeCustomer(customer)}
                      disabled={sending}
                      className={secondaryButtonClass}
                    >
                      Yes, delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        clearNotice(customer.id);
                        setConfirmId(customer.id);
                      }}
                      className={secondaryButtonClass}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {confirmId === customer.id && (
                  <p role="alert" className={`${errorClass} mt-3`}>
                    Delete {customer.name}? Their message history goes too, and the
                    30-day record for that number goes with it.{" "}
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="font-semibold underline"
                    >
                      Cancel
                    </button>
                  </p>
                )}

                {notice && (
                  <p
                    role={notice.startsWith("Opened") ? "status" : "alert"}
                    className={`${errorClass} mt-3`}
                  >
                    {notice}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
