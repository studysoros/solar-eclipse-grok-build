/**
 * Known solar eclipse catalog for validation and UI.
 *
 * Data is a small curated subset of real events (primarily total solar eclipses)
 * sourced from public NASA GSFC catalogs (https://eclipse.gsfc.nasa.gov/).
 *
 * We store:
 *   - ISO date (UTC) of greatest eclipse
 *   - Type (Total / Annular / Partial / Hybrid)
 *   - A short note / visibility region (for UX)
 *   - Optional: approximate gamma or duration for richer future use
 *
 * The Zod schema makes this the source of truth. The simulator can later
 * compare its own predicted eclipse times against these known events.
 */

import { z } from "zod";

export const EclipseRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  type: z.enum(["Total", "Annular", "Partial", "Hybrid"]),
  note: z.string(),
  // Future: gamma, durationSeconds, saros, etc.
});

export type EclipseRecord = z.infer<typeof EclipseRecordSchema>;

export const EclipseCatalogSchema = z.array(EclipseRecordSchema);

export const KNOWN_SOLAR_ECLIPSES: EclipseRecord[] = [
  {
    date: "2024-04-08",
    type: "Total",
    note: "North America (Mexico, USA, Canada) — widely observed total eclipse",
  },
  {
    date: "2026-08-12",
    type: "Total",
    note: "Spain, Iceland, Greenland — total eclipse visible in Europe",
  },
  {
    date: "2027-08-02",
    type: "Total",
    note: "Spain, North Africa, Middle East — long totality",
  },
  {
    date: "2028-07-22",
    type: "Total",
    note: "Australia, New Zealand region",
  },
  {
    date: "2030-06-01",
    type: "Annular",
    note: "Southern Europe / North Africa / Middle East (annular)",
  },
  {
    date: "2033-03-30",
    type: "Total",
    note: "Alaska / far eastern Russia",
  },
  {
    date: "2034-03-20",
    type: "Total",
    note: "North America (Pacific Northwest to Texas area)",
  },
  {
    date: "2035-09-02",
    type: "Total",
    note: "China, Korea, Japan",
  },
];

// Runtime validation on load (helps catch bad data edits)
export const validatedCatalog: EclipseRecord[] = EclipseCatalogSchema.parse(KNOWN_SOLAR_ECLIPSES);

/**
 * Find a record by exact date string (YYYY-MM-DD).
 */
export function getEclipseByDate(date: string): EclipseRecord | undefined {
  return validatedCatalog.find((e) => e.date === date);
}

/**
 * Return upcoming eclipses after a given date (inclusive).
 */
export function getEclipsesAfter(date: string): EclipseRecord[] {
  return validatedCatalog.filter((e) => e.date >= date);
}
