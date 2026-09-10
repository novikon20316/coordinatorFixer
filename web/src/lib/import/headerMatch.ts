/**
 * Helpers for locating and reading the real header row(s) in the coordinator's
 * source Excel files - see parseCandidatePool.ts / parseSemesterGrades.ts /
 * parseRoster.ts. These files were exported by hand over several years and
 * don't share a fixed layout: a title/legend occupies the first row or two,
 * column sets vary, and Hebrew header text has small spelling/whitespace
 * variants across years - so header lookup is always by normalized text, not
 * column position.
 */

export type SheetRows = unknown[][];

export function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Finds the row that holds the real column headers by scanning the first
 *  few rows for one containing any of `keySubstrings` (e.g. "שם") - title
 *  and legend rows above it don't contain these. */
export function findHeaderRowIndex(rows: SheetRows, keySubstrings: string[], scanRows = 8): number {
  for (let i = 0; i < Math.min(rows.length, scanRows); i++) {
    const row = rows[i] ?? [];
    if (row.some((cell) => keySubstrings.some((k) => normalizeHeader(cell).includes(k)))) return i;
  }
  return -1;
}

export type HeaderMap = Record<string, number>;

export function buildHeaderMap(row: SheetRows[number]): HeaderMap {
  const map: HeaderMap = {};
  (row ?? []).forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (h && map[h] === undefined) map[h] = i;
  });
  return map;
}

/** Reads a row's cell for whichever of `aliases` is an exact header match. */
export function getByHeader(row: SheetRows[number], headerMap: HeaderMap, ...aliases: string[]): unknown {
  for (const alias of aliases) {
    if (headerMap[alias] !== undefined) return row[headerMap[alias]];
  }
  return undefined;
}

/** Same as getByHeader, but matches a header that merely *contains* one of
 *  `aliases` as a substring - for the handful of columns whose exact text
 *  varies (trailing punctuation, a stray character) across files. */
export function findHeaderKeyContaining(headerMap: HeaderMap, aliases: string[]): string | undefined {
  const keys = Object.keys(headerMap);
  for (const alias of aliases) {
    const found = keys.find((k) => k.includes(alias));
    if (found) return found;
  }
  return undefined;
}

/** Forward-fills a sparse header row (as produced when reading a sheet with
 *  merged header cells - only the first cell of a merge carries a value,
 *  the rest read as "") so every column index gets the label of the block
 *  it visually belongs to. */
export function forwardFill(row: SheetRows[number], length: number): string[] {
  const filled: string[] = [];
  let last = "";
  for (let i = 0; i < length; i++) {
    const v = normalizeHeader(row?.[i]);
    if (v) last = v;
    filled.push(last);
  }
  return filled;
}

/** True when a "name" cell is actually a repeated header row (some sheets
 *  reprint the header row before a second batch of real data further down -
 *  observed in several candidate-pool files) - the row itself isn't a
 *  person and should be skipped, but real rows after it are not. */
export function isHeaderRepeat(name: string, headerKeySubstrings: string[]): boolean {
  const n = normalizeHeader(name);
  return headerKeySubstrings.some((k) => n === k);
}

/** True when a "name" cell is a trailing summary/statistics marker (e.g.
 *  "ממוצע הקורס", "חציון") or a stray bare ID number - observed at the tail
 *  of at least one grade sheet, followed by an unrelated, unreliable second
 *  table (duplicate ID numbers across different people). Signals the real
 *  data block has ended; callers should stop reading rows here rather than
 *  importing whatever comes after. */
export function isTrailingSummaryMarker(name: string): boolean {
  const n = normalizeHeader(name);
  if (!n) return false;
  if (/^\d+(\.\d+)?$/.test(n)) return true;
  return ["ממוצע הקורס", "חציון", "ממוצע", 'סה"כ', "סך הכל"].includes(n);
}

export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

export function toNumberOrText(value: unknown): number | string | undefined {
  if (isBlank(value)) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && String(value).trim() !== "" ? n : String(value).trim();
}
