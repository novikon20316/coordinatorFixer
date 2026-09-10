/**
 * Hebrew academic years the system knows about (מחזורים). New years are
 * added here as they start - see CURRENT_HEBREW_YEAR below, which the
 * coordinator bumps once a year at Rosh Hashanah.
 */
export type HebrewYear = "תשפג" | "תשפד" | "תשפה" | "תשפו" | "תשפז";

export const HEBREW_YEAR_VALUES: HebrewYear[] = ["תשפג", "תשפד", "תשפה", "תשפו", "תשפז"];

/** The Hebrew year currently in progress. Update this once a year - there is
 *  no calendar math here on purpose, matching how the rest of the app treats
 *  academic years as a fixed, coordinator-maintained list rather than a
 *  computed value. */
export const CURRENT_HEBREW_YEAR: HebrewYear = "תשפז";

/** Shifts a Hebrew year by `n` (can be negative) along HEBREW_YEAR_VALUES.
 *  Throws if the result falls outside the known list - callers should add
 *  the target year to HEBREW_YEAR_VALUES first if it's genuinely new. */
export function addHebrewYears(year: HebrewYear, n: number): HebrewYear {
  const index = HEBREW_YEAR_VALUES.indexOf(year) + n;
  const result = HEBREW_YEAR_VALUES[index];
  if (!result) throw new Error(`No known Hebrew year ${n} away from ${year}`);
  return result;
}

/** Where a student who started in `cohortYear` stands as of `asOfYear`
 *  (defaults to the current Hebrew year) - the program is 2 years long, so a
 *  cohort is in year 1 the year it starts, year 2 the year after, and
 *  graduated from then on. */
export function yearOfStudy(
  cohortYear: HebrewYear,
  asOfYear: HebrewYear = CURRENT_HEBREW_YEAR
): 1 | 2 | "GRADUATED" {
  const elapsed = HEBREW_YEAR_VALUES.indexOf(asOfYear) - HEBREW_YEAR_VALUES.indexOf(cohortYear);
  if (elapsed <= 0) return 1;
  if (elapsed === 1) return 2;
  return "GRADUATED";
}
