/**
 * CSV parsing utilities for dashboard data ingestion.
 *
 * Assumptions:
 * - Supports RFC4180-style quoted fields, embedded commas, and escaped quotes.
 * - Returns rows as plain string arrays without applying type conversion.
 *
 * Failure modes:
 * - Throws if a quoted field is unterminated.
 */
export function parseCSV(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '"') {
      const nextChar = normalized[index + 1];
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (!inQuotes && char === '\n') {
      row.push(value.trim());
      if (row.some(cell => cell.length)) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }

  if (value.length || row.length) {
    row.push(value.trim());
    if (row.some(cell => cell.length)) rows.push(row);
  }

  return rows;
}
