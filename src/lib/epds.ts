/**
 * Edinburgh Postnatal Depression Scale (EPDS) — a validated 10-item screening
 * questionnaire for perinatal mood. Each item is answered on a 0–3 scale;
 * options here are pre-scored (some EPDS items are reverse-scored, which is
 * already baked into each option's `value`). Total ranges 0–30.
 *
 * This is a SCREENING aid, not a diagnosis. It's widely used by clinicians but
 * a score never replaces a conversation with a provider. Item 10 (self-harm) is
 * surfaced separately because any positive answer warrants prompt follow-up.
 */

export type EpdsOption = { label: string; value: 0 | 1 | 2 | 3 };
export type EpdsQuestion = {
  /** Stable 1-based id, matches the clinical item number. */
  id: number;
  prompt: string;
  options: EpdsOption[];
};

/** Index (0-based) of the self-harm item within answers[]. */
export const SELF_HARM_INDEX = 9;

export const EPDS_QUESTIONS: EpdsQuestion[] = [
  {
    id: 1,
    prompt: "I have been able to laugh and see the funny side of things.",
    options: [
      { label: "As much as I always could", value: 0 },
      { label: "Not quite so much now", value: 1 },
      { label: "Definitely not so much now", value: 2 },
      { label: "Not at all", value: 3 },
    ],
  },
  {
    id: 2,
    prompt: "I have looked forward with enjoyment to things.",
    options: [
      { label: "As much as I ever did", value: 0 },
      { label: "Rather less than I used to", value: 1 },
      { label: "Definitely less than I used to", value: 2 },
      { label: "Hardly at all", value: 3 },
    ],
  },
  {
    id: 3,
    prompt: "I have blamed myself unnecessarily when things went wrong.",
    options: [
      { label: "Yes, most of the time", value: 3 },
      { label: "Yes, some of the time", value: 2 },
      { label: "Not very often", value: 1 },
      { label: "No, never", value: 0 },
    ],
  },
  {
    id: 4,
    prompt: "I have been anxious or worried for no good reason.",
    options: [
      { label: "No, not at all", value: 0 },
      { label: "Hardly ever", value: 1 },
      { label: "Yes, sometimes", value: 2 },
      { label: "Yes, very often", value: 3 },
    ],
  },
  {
    id: 5,
    prompt: "I have felt scared or panicky for no very good reason.",
    options: [
      { label: "Yes, quite a lot", value: 3 },
      { label: "Yes, sometimes", value: 2 },
      { label: "No, not much", value: 1 },
      { label: "No, not at all", value: 0 },
    ],
  },
  {
    id: 6,
    prompt: "Things have been getting on top of me.",
    options: [
      { label: "Yes, most of the time I haven't been able to cope", value: 3 },
      { label: "Yes, sometimes I haven't been coping as well as usual", value: 2 },
      { label: "No, most of the time I have coped quite well", value: 1 },
      { label: "No, I have been coping as well as ever", value: 0 },
    ],
  },
  {
    id: 7,
    prompt: "I have been so unhappy that I have had difficulty sleeping.",
    options: [
      { label: "Yes, most of the time", value: 3 },
      { label: "Yes, sometimes", value: 2 },
      { label: "Not very often", value: 1 },
      { label: "No, not at all", value: 0 },
    ],
  },
  {
    id: 8,
    prompt: "I have felt sad or miserable.",
    options: [
      { label: "Yes, most of the time", value: 3 },
      { label: "Yes, quite often", value: 2 },
      { label: "Not very often", value: 1 },
      { label: "No, not at all", value: 0 },
    ],
  },
  {
    id: 9,
    prompt: "I have been so unhappy that I have been crying.",
    options: [
      { label: "Yes, most of the time", value: 3 },
      { label: "Yes, quite often", value: 2 },
      { label: "Only occasionally", value: 1 },
      { label: "No, never", value: 0 },
    ],
  },
  {
    id: 10,
    prompt: "The thought of harming myself has occurred to me.",
    options: [
      { label: "Yes, quite often", value: 3 },
      { label: "Sometimes", value: 2 },
      { label: "Hardly ever", value: 1 },
      { label: "Never", value: 0 },
    ],
  },
];

export type EpdsBand = "low" | "possible" | "likely";

export type EpdsResult = {
  score: number;
  band: EpdsBand;
  /** True if item 10 (self-harm) was answered above zero. */
  selfHarmFlag: boolean;
  headline: string;
  guidance: string;
};

/** Total an answers array (each 0–3). */
export function scoreEpds(answers: number[]): number {
  return answers.reduce((s, a) => s + (a || 0), 0);
}

/**
 * Interpret a completed EPDS. Bands follow common clinical guidance
 * (≥13 likely depression, 10–12 possible/monitor), but a positive item-10
 * answer overrides to the strongest guidance regardless of total.
 */
export function interpretEpds(answers: number[]): EpdsResult {
  const score = scoreEpds(answers);
  const selfHarmFlag = (answers[SELF_HARM_INDEX] ?? 0) > 0;
  const band: EpdsBand = score >= 13 ? "likely" : score >= 10 ? "possible" : "low";

  let headline: string;
  let guidance: string;
  if (selfHarmFlag) {
    headline = "Please reach out today.";
    guidance =
      "You answered that thoughts of harming yourself have occurred. You deserve support right now — call or text 988 (Suicide & Crisis Lifeline, US), or your provider. If you're in immediate danger, call emergency services.";
  } else if (band === "likely") {
    headline = "This is worth talking through with someone.";
    guidance =
      "Your answers suggest you may be experiencing depression. This is common and treatable — please share this with your OB, midwife, or doctor. You don't have to wait for it to pass on its own.";
  } else if (band === "possible") {
    headline = "Keep an eye on how you're feeling.";
    guidance =
      "Your answers suggest some low mood. Consider checking in again in a week or two, and mention it to your provider if it lingers or deepens.";
  } else {
    headline = "You're doing okay right now.";
    guidance =
      "Your answers don't suggest depression today. Mood can shift week to week in the postpartum period, so it's worth checking back in now and then.";
  }

  return { score, band, selfHarmFlag, headline, guidance };
}
