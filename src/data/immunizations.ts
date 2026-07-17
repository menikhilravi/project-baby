/**
 * AAP well-baby visit ages + the CDC childhood immunization schedule for
 * birth–18 months, grouped by the visit each dose is normally given at.
 *
 * This is a REFERENCE to help parents keep track — not medical advice, and not
 * a substitute for your pediatrician, who sets the actual schedule (brands,
 * catch-ups, and timing vary). Source: CDC Child & Adolescent Immunization
 * Schedule and AAP Bright Futures periodicity.
 */

export type Vaccine = {
  /** Stable code shared with the vaccine_doses table. */
  code: string;
  /** Short display name. */
  label: string;
  /** Dose within the series: "1", "2", "3", "booster", or "yearly". */
  dose: string;
};

export type WellVisit = {
  /** Stable slug shared with the appointments table (e.g. "well_2mo"). */
  slug: string;
  label: string;
  /** Age at the visit, in months from birth (0 = at birth). */
  ageMonths: number;
  /** Doses routinely given at this visit. */
  vaccines: Vaccine[];
};

export const WELL_VISITS: WellVisit[] = [
  {
    slug: "well_birth",
    label: "Newborn",
    ageMonths: 0,
    vaccines: [{ code: "hepb", label: "Hepatitis B", dose: "1" }],
  },
  {
    slug: "well_1mo",
    label: "1 month",
    ageMonths: 1,
    vaccines: [{ code: "hepb", label: "Hepatitis B", dose: "2" }],
  },
  {
    slug: "well_2mo",
    label: "2 months",
    ageMonths: 2,
    vaccines: [
      { code: "dtap", label: "DTaP", dose: "1" },
      { code: "hib", label: "Hib", dose: "1" },
      { code: "ipv", label: "Polio (IPV)", dose: "1" },
      { code: "pcv", label: "Pneumococcal (PCV)", dose: "1" },
      { code: "rv", label: "Rotavirus", dose: "1" },
    ],
  },
  {
    slug: "well_4mo",
    label: "4 months",
    ageMonths: 4,
    vaccines: [
      { code: "dtap", label: "DTaP", dose: "2" },
      { code: "hib", label: "Hib", dose: "2" },
      { code: "ipv", label: "Polio (IPV)", dose: "2" },
      { code: "pcv", label: "Pneumococcal (PCV)", dose: "2" },
      { code: "rv", label: "Rotavirus", dose: "2" },
    ],
  },
  {
    slug: "well_6mo",
    label: "6 months",
    ageMonths: 6,
    vaccines: [
      { code: "dtap", label: "DTaP", dose: "3" },
      { code: "hib", label: "Hib", dose: "3" },
      { code: "ipv", label: "Polio (IPV)", dose: "3" },
      { code: "pcv", label: "Pneumococcal (PCV)", dose: "3" },
      { code: "rv", label: "Rotavirus", dose: "3" },
      { code: "hepb", label: "Hepatitis B", dose: "3" },
      { code: "flu", label: "Influenza", dose: "yearly" },
    ],
  },
  {
    slug: "well_9mo",
    label: "9 months",
    ageMonths: 9,
    vaccines: [],
  },
  {
    slug: "well_12mo",
    label: "12 months",
    ageMonths: 12,
    vaccines: [
      { code: "mmr", label: "MMR", dose: "1" },
      { code: "varicella", label: "Chickenpox", dose: "1" },
      { code: "hepa", label: "Hepatitis A", dose: "1" },
      { code: "hib", label: "Hib", dose: "booster" },
      { code: "pcv", label: "Pneumococcal (PCV)", dose: "booster" },
    ],
  },
  {
    slug: "well_15mo",
    label: "15 months",
    ageMonths: 15,
    vaccines: [{ code: "dtap", label: "DTaP", dose: "4" }],
  },
  {
    slug: "well_18mo",
    label: "18 months",
    ageMonths: 18,
    vaccines: [{ code: "hepa", label: "Hepatitis A", dose: "2" }],
  },
];

/** Stable key for a single dose, matching vaccine_doses(vaccine, dose). */
export function doseKey(vaccine: string, dose: string): string {
  return `${vaccine}:${dose}`;
}
