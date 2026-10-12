"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_IMPORT_ROWS,
  readCustomerCsv,
  type ParsedRow,
} from "@/lib/csv";
import { validateCustomer } from "@/lib/customer";
import {
  badgeClass,
  errorClass,
  labelClass,
  mutedClass,
  secondaryButtonClass,
  smallPrimaryButtonClass,
} from "@/lib/forms";

type Props = {
  businessId: string;
  existingPhones: string[];
};

type PreviewRow = ParsedRow & {
  status: "ready" | "skipped";
  reason?: string;
};

type Result = {
  imported: number;
  skipped: { row: number; reason: string }[];
};

export function CsvImport({ businessId, existingPhones }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setPreview(null);
    setFileName(null);
    setResult(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null);
    setResult(null);
    setFileError(null);
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();
    const parsed = readCustomerCsv(text);
    if (!parsed.ok) {
      setFileError(parsed.error);
      return;
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      setFileError(
        `That file has ${parsed.rows.length} rows. The limit is ${MAX_IMPORT_ROWS} — split it and import in parts.`,
      );
      return;
    }

    const existing = new Set(existingPhones.map((phone) => phone.replace(/^\+/, "")));
    const seen = new Map<string, number>();

    setPreview(
      parsed.rows.map((row) => {
        const result = validateCustomer(row);
        if (!result.ok) {
          const reason = result.errors.name ?? result.errors.phone ?? result.errors.email;
          return { ...row, status: "skipped" as const, reason };
        }
        const digits = result.value.phone.replace(/^\+/, "");
        const firstSeen = seen.get(digits);
        if (firstSeen !== undefined) {
          return { ...row, status: "skipped" as const, reason: `Same number as row ${firstSeen}` };
        }
        if (existing.has(digits)) {
          return { ...row, status: "skipped" as const, reason: "Already on your list" };
        }
        seen.set(digits, row.row);
        return { ...row, status: "ready" as const };
      }),
    );
  }

  async function handleImport() {
    if (!preview) return;
    const ready = preview.filter((row) => row.status === "ready");
    if (ready.length === 0) return;

    setPending(true);
    const response = await fetch("/api/customers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: ready.map((row) => ({
          row: row.row,
          name: row.name,
          phone: row.phone,
          email: row.email,
        })),
      }),
    }).catch(() => null);

    setPending(false);

    if (!response || !response.ok) {
      const data = await response?.json().catch(() => null);
      setFileError(data?.error ?? "We couldn't import that file. Try again.");
      return;
    }

    const data = (await response.json()) as Result;
    // Clear the preview first: reset() also clears the result, so setting
    // them the other way round would erase the confirmation instantly.
    reset();
    setResult(data);
    router.refresh();
  }

  const readyCount = preview?.filter((row) => row.status === "ready").length ?? 0;
  const skippedCount = preview ? preview.length - readyCount : 0;

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <h2 className="text-xl">Import from a CSV</h2>
      <p className={`${mutedClass} mt-1`}>
        A file with a header row of name, phone, email. We check every row before
        anything is added, and tell you which rows we skip.
      </p>

      <div className="mt-5">
        <label htmlFor="csv-file" className={labelClass}>
          CSV file
        </label>
        <input
          id="csv-file"
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="mt-2 block w-full text-sm text-[var(--text-muted)] file:mr-4 file:rounded-[12px] file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text)]"
        />
      </div>

      {fileError && (
        <p role="alert" className={`${errorClass} mt-4`}>
          {fileError}
        </p>
      )}

      {result && (
        <p role="status" className={`${errorClass} mt-4`}>
          Imported {result.imported} {result.imported === 1 ? "customer" : "customers"}.
          {result.skipped.length > 0 &&
            ` ${result.skipped.length} skipped: ${result.skipped
              .map((row) => `row ${row.row} (${row.reason})`)
              .join(", ")}.`}
        </p>
      )}

      {preview && (
        <div className="mt-5">
          <p className={mutedClass}>
            {fileName ? `${fileName}: ` : ""}
            {readyCount} ready to import{skippedCount > 0 ? `, ${skippedCount} will be skipped` : ""}.
          </p>

          <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
            {preview.map((row) => (
              <li
                key={row.row}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm"
              >
                <span>
                  <span className={mutedClass}>Row {row.row}</span>{" "}
                  {row.name || <span className={mutedClass}>(no name)</span>} ·{" "}
                  {row.phone || <span className={mutedClass}>(no phone)</span>}
                  {row.email ? ` · ${row.email}` : ""}
                </span>
                {row.status === "ready" ? (
                  <span className={badgeClass}>Ready</span>
                ) : (
                  <span className={mutedClass}>{row.reason}</span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleImport}
              disabled={pending || readyCount === 0}
              className={smallPrimaryButtonClass}
            >
              {pending ? "Importing…" : `Import ${readyCount}`}
            </button>
            <button type="button" onClick={reset} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
