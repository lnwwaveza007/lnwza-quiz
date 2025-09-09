import { z } from "zod";
import type { Question, QuizResult, QuizSet } from "./types";
import { containsFuzzy } from "./utils/fuzzy";

export const EvidenceSchema = z.object({
  pageNumbers: z.array(z.number().int().positive()),
  snippets: z.array(z.string().min(1)).min(1).max(3),
});

export const QuestionSchema: z.ZodType<Question> = z.object({
  id: z.string(),
  type: z.enum(["single_choice", "multiple_choice", "short_answer"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string().min(3),
  options: z
    .array(z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean().optional() }))
    .optional(),
  shortAnswerAccepted: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  source: z.object({ pdfName: z.string(), evidence: EvidenceSchema }),
  topicTags: z.array(z.string()),
});

export const QuizSetSchema: z.ZodType<QuizSet> = z.object({
  id: z.string(),
  title: z.string(),
  pdfName: z.string(),
  createdAt: z.string(),
  questionCount: z.number().int().nonnegative(),
  questions: z.array(QuestionSchema),
  status: z.enum(["draft", "published"]),
});

export const QuizResultSchema: z.ZodType<QuizResult> = z.object({
  id: z.string(),
  quizId: z.string(),
  takenAt: z.string(),
  durationSec: z.number().int().nonnegative(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionIds: z.array(z.string()).optional(),
      shortAnswerText: z.string().optional(),
      isCorrect: z.boolean(),
    }),
  ),
  score: z.object({ correct: z.number().int(), total: z.number().int(), percent: z.number() }),
});

export type EvidenceValidationInput = {
  pdfTextByPage: Record<number, string>;
  question: Question;
};

export function validateEvidence({ pdfTextByPage, question }: EvidenceValidationInput): boolean {
  const pages = question.source.evidence.pageNumbers;
  const snippets = question.source.evidence.snippets;
  if (!pages.length || !snippets.length) return false;
  const pageSet = new Set(pages);
  // 80% single-page rule check is applied across a set of questions elsewhere
  for (const snippet of snippets) {
    let found = false;
    for (const p of pageSet) {
      const text = pdfTextByPage[p] || "";
      if (!text) continue;
      if (containsFuzzy(text, snippet, 0.9)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

export function validateChoiceRules(q: Question): boolean {
  if (q.type === "single_choice") {
    const opts = q.options || [];
    const correct = opts.filter((o) => o.isCorrect);
    return opts.length >= 2 && correct.length === 1;
  }
  if (q.type === "multiple_choice") {
    const opts = q.options || [];
    const correct = opts.filter((o) => o.isCorrect);
    return opts.length >= 3 && correct.length >= 2;
  }
  if (q.type === "short_answer") {
    return Array.isArray(q.shortAnswerAccepted) && q.shortAnswerAccepted.length > 0;
  }
  return false;
}

export function matchShortAnswer(
  accepted: string[] | undefined,
  userText: string | undefined,
): boolean {
  if (!accepted || !accepted.length || !userText) return false;
  const text = normalize(userText);
  return accepted.some((a) => normalize(a) === text || containsFuzzy(text, normalize(a), 0.95));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


