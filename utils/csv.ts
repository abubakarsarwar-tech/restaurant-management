/**
 * Minimal RFC-4180 CSV serializer/parser — no dependency, used by catalog
 * import/export. Handles quoted fields, embedded commas/quotes/newlines,
 * CRLF line endings and a leading BOM.
 */

/** Serialize rows to CSV text. `headers` fixes column order. */
export function toCsv(
  headers: string[],
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
): string {
  const escape = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export type CsvParseResult = {
  headers: string[];
  rows: Array<Record<string, string>>;
  /** 1-based line numbers that were skipped (column-count mismatch) */
  skippedLines: number[];
};

/** Parse CSV text into header-keyed records. */
export function parseCsv(input: string): CsvParseResult {
  const text = input.replace(/^\uFEFF/, ""); // strip BOM
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
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
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      // ignore completely blank trailing lines
      if (record.length > 1 || record[0] !== "") records.push(record);
      record = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    if (record.length > 1 || record[0] !== "") records.push(record);
  }

  const [headerRow, ...dataRows] = records;
  const headers = (headerRow ?? []).map((h) => h.trim());

  const rows: Array<Record<string, string>> = [];
  const skippedLines: number[] = [];
  dataRows.forEach((cells, index) => {
    if (cells.length !== headers.length) {
      skippedLines.push(index + 2); // +1 header, +1 1-based
      return;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i]?.trim() ?? "";
    });
    rows.push(row);
  });

  return { headers, rows, skippedLines };
}

/** Trigger a browser download of CSV content. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
