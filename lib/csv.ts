// Small RFC 4180 CSV reader: quoted fields may contain commas, newlines, and
// doubled quotes; the delimiter is sniffed from the header record so European
// exports that use semicolons read the same as comma ones. No dependency,
// because the only file we read is a list of names and phone numbers.

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

// Excel writes semicolons in comma-decimal locales and commas elsewhere, so
// pick whichever appears more often outside quotes in the header record.
function sniffDelimiter(text: string): "," | ";" {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes; // "" inside a quoted field toggles twice
    } else if (!inQuotes) {
      if (char === ",") commas++;
      else if (char === ";") semicolons++;
      else if (char === "\n") break; // header record only
    }
  }
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(input: string): string[][] {
  const text = (input ?? "").replace(/^\uFEFF/, "");
  const delimiter = sniffDelimiter(text);
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
    } else if (char === delimiter) {
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

  // Blank lines are dropped by readCustomerCsv, not here, so the row numbers
  // it assigns still match the rows the owner sees in their spreadsheet.
  return rows;
}

// Headers are matched leniently because exports name these columns a dozen
// ways ("Mobile", "Phone Number", "e-mail"). Normalise, then accept the
// common spellings.
const NAME_HEADERS = ["name", "customername", "customer", "fullname", "contactname"];
const PHONE_HEADERS = [
  "phone",
  "phonenumber",
  "mobile",
  "mobilenumber",
  "telephone",
  "tel",
  "cell",
  "cellphone",
  "contactnumber",
];
const EMAIL_HEADERS = ["email", "emailaddress", "mail"];

function normaliseHeader(cell: string): string {
  return cell.trim().toLowerCase().replace(/[\s_\-().]/g, "");
}

function findColumn(header: string[], accepted: string[]): number {
  return header.findIndex((cell) => accepted.includes(normaliseHeader(cell)));
}

export function readCustomerCsv(text: string): CsvRead {
  const table = parseCsv(text);
  if (table.length === 0 || table.every((cells) => cells.every((cell) => cell.trim() === ""))) {
    return { ok: false, error: "That file is empty." };
  }

  const header = table[0];
  const nameIdx = findColumn(header, NAME_HEADERS);
  const phoneIdx = findColumn(header, PHONE_HEADERS);
  const emailIdx = findColumn(header, EMAIL_HEADERS);
  if (nameIdx === -1 || phoneIdx === -1) {
    const found = header.map((cell) => cell.trim()).filter(Boolean).join(", ");
    return {
      ok: false,
      error:
        "We couldn't find the name and phone columns. The first row must be a header " +
        `row with name and phone in it (we also accept headers like customer, mobile, or tel). ` +
        `This file's header is: ${found || "(blank)"}.`,
    };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (!cells.some((cell) => cell.trim() !== "")) continue; // blank line; numbering keeps its place
    rows.push({
      row: i + 1, // header is row 1, matching the spreadsheet
      name: (cells[nameIdx] ?? "").trim(),
      phone: (cells[phoneIdx] ?? "").trim(),
      email: emailIdx === -1 ? "" : (cells[emailIdx] ?? "").trim(),
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "That file has no customers in it. Keep the header row, then add one customer per row.",
    };
  }

  return { ok: true, rows };
}
