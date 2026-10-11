// Shared class strings for the auth and setup forms. Solid --surface cards, no
// glass on forms (DESIGN.md). Values reuse the DESIGN radius and colour tokens.
export const cardClass =
  "w-full max-w-md rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8";

export const inputClass =
  "w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)]";

export const textareaClass =
  "w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-muted)] min-h-[160px] resize-y";

export const labelClass = "block text-sm font-medium text-[var(--text)]";

export const primaryButtonClass =
  "w-full rounded-[12px] bg-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60";

export const errorClass =
  "rounded-[12px] border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[var(--bg)] p-4 text-sm text-[var(--text)]";

export const mutedClass = "text-sm text-[var(--text-muted)]";
