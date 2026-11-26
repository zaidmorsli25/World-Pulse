/**
 * Deterministic validation applied to every briefing and quiz before players can see it,
 * whether written by the AI pipeline or by hand (demo content is tested with the same rules).
 */
import countries from "@/data/generated/countries.json";
import { FIGURE_IDS } from "@/data/figures";
import type { Briefing, Claim, QuizQuestion } from "../types";

export const COUNTRY_IDS = new Set((countries as { id: string }[]).map((c) => c.id));

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();

export function briefingText(b: Pick<Briefing, "whatHappened" | "background" | "whyItMatters" | "whatNext" | "involved">): string {
  return [...b.whatHappened, ...b.background, ...b.whyItMatters, ...b.whatNext].map((c) => c.text).join(" ") + " " + b.involved.map((i) => `${i.name} ${i.role}`).join(" ");
}

export interface QuestionIssue {
  index: number;
  problem: string;
}

export function validateQuestion(q: Omit<QuizQuestion, "id">, text: string): string | null {
  if (!q.prompt?.trim()) return "empty prompt";
  if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 5) return "needs 2 to 5 choices";
  if (q.choices.some((c) => !c?.trim())) return "empty choice";
  if (new Set(q.choices.map(normalize)).size !== q.choices.length) return "duplicate choices";
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= q.choices.length) return "answer index out of range";
  if (q.type === "true_false" && (q.choices.length !== 2 || normalize(q.choices[0]) !== "true" || normalize(q.choices[1]) !== "false")) return "true/false choices must be True, False";
  if (q.type === "map" || q.type === "country_id") {
    if (!q.countryIds || q.countryIds.length !== q.choices.length) return "countryIds must align with choices";
    if (q.countryIds.some((id) => !COUNTRY_IDS.has(id))) return "unknown country id";
  }
  if (q.type === "figure_id") {
    if (!q.figureIds || q.figureIds.length !== q.choices.length) return "figureIds must align with choices";
    if (q.figureIds.some((id) => !FIGURE_IDS.has(id))) return "unknown figure id";
  }
  if (!q.explanation?.trim()) return "missing explanation";
  if (!q.evidence?.trim() || !normalize(text).includes(normalize(q.evidence))) return "evidence not found in briefing";
  return null;
}

export function validateQuiz(questions: Omit<QuizQuestion, "id">[], text: string) {
  const valid: Omit<QuizQuestion, "id">[] = [];
  const issues: QuestionIssue[] = [];
  questions.forEach((q, index) => {
    const problem = validateQuestion(q, text);
    if (problem) issues.push({ index, problem });
    else valid.push(q);
  });
  return { valid: valid.slice(0, 5), issues };
}

/** Keeps only citations to articles in the cluster; event claims must keep at least one. */
export function sanitizeClaims(claims: Claim[], articleIds: Set<string>, requireSource: boolean): Claim[] {
  return claims
    .map((c) => ({ text: c.text.trim().slice(0, 600), kind: c.kind, sources: (c.sources ?? []).filter((s) => articleIds.has(s)) }))
    .filter((c) => c.text && (!requireSource || c.sources.length > 0));
}
