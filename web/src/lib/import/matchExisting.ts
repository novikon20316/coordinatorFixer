/**
 * Matches a freshly-parsed import row against records already in the
 * system. Several of the coordinator's source files have no ID-number
 * column at all (see the plan's file-shape notes), so name matching is a
 * required fallback, not just a convenience - callers show the match in the
 * review step so the coordinator can catch a false match before anything
 * is saved.
 */

function normalizeName(name: string): string {
  return name
    .replace(/[׳'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchExisting<T extends { id: string; idNumber?: string; fullName: string }>(
  row: { idNumber?: string; fullName: string },
  existing: T[]
): string | null {
  if (row.idNumber) {
    const byId = existing.find((e) => e.idNumber && e.idNumber === row.idNumber);
    if (byId) return byId.id;
  }
  const target = normalizeName(row.fullName);
  const byName = existing.find((e) => normalizeName(e.fullName) === target);
  return byName ? byName.id : null;
}
