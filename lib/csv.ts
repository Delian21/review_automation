// Small RFC 4180 CSV reader: quoted fields may contain commas, newlines, and
// doubled quotes. No dependency, because the only file we read is a list of
// names and phone numbers.

export type ParsedRow = {
  row: number;
  name: string;
  phone: string;
  email: string;
};

export type CsvRead =
  | { ok: true; rows: ParsedRow[] }
  | { ok: false; error: string };

export const MAX_IMPORT_ROWS = 1000;

export function parseCsv(input: string): string[][] {
  const text = (input ?? "").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

export function readCustomerCsv(text: string): CsvRead {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (table.length < 2) {
    return {
      ok: false,
      error: "That file has no customers in it. Keep the header row, then add one customer per row.",
    };
  }

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const phoneIdx = header.indexOf("phone");
  const emailIdx = header.indexOf("email");
  if (nameIdx === -1 || phoneIdx === -1) {
    return {
      ok: false,
      error: "We couldn't find the name and phone columns. The first row must be a header with name and phone in it.",
    };
  }

  const rows: ParsedRow[] = table.slice(1).map((cells, index) => ({
    row: index + 2,
    name: (cells[nameIdx] ?? "").trim(),
    phone: (cells[phoneIdx] ?? "").trim(),
    email: emailIdx === -1 ? "" : (cells[emailIdx] ?? "").trim(),
  }));

  return { ok: true, rows };
}
