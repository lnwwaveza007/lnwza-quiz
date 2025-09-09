import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";
import type { Difficulty, Question, QuestionType } from "@/lib/types";
import { validateChoiceRules, validateEvidence } from "@/lib/validation";

export type GenerateInput = {
  pdfName: string;
  perPageText: { pageNumber: number; text: string }[];
  pdfBytes?: Uint8Array;
  pdfMime?: string;
  desiredCount: number;
  allowedTypes: QuestionType[];
  difficultyMix: { easy: number; medium: number; hard: number };
};

const USE_MOCK = process.env.USE_MOCK_GEMINI === "true";

export async function generateQuestions(input: GenerateInput): Promise<Question[]> {
  if (USE_MOCK) return mockGenerate(input);
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyA7B3yAGC3vpZ_moDWgHF6lb7R5MjIli2c";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set and USE_MOCK_GEMINI is not enabled");
  }

  const compactContext = buildCompactContext(input);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Accumulate questions across multiple requests until we reach desired count
  const accumulated: Question[] = [];
  const seenPromptKeys = new Set<string>();

  const maxRequests = 5; // hard cap to avoid infinite loops
  for (let attempt = 0; attempt < maxRequests && accumulated.length < input.desiredCount; attempt++) {
    const remaining = input.desiredCount - accumulated.length;
    const prompt = buildPrompt({ ...input, desiredCount: remaining }, compactContext, {
      excludePrompts: Array.from(seenPromptKeys).slice(0, 50),
    });

    const res = await backoff(async () => {
      if (input.pdfBytes && input.pdfBytes.length > 0) {
        const base64 = toBase64(input.pdfBytes);
        const out = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: base64, mimeType: input.pdfMime || "application/pdf" } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        });
        return out.response.text();
      }
      const out = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      });
      return out.response.text();
    });

    let candidates = parseQuestionsJson(res, { ...input, desiredCount: remaining });
    candidates = candidates.filter((q) => !seenPromptKeys.has(normalizeQuestionKey(q)));

    // Append and update dedupe set
    for (const q of candidates) {
      const key = normalizeQuestionKey(q);
      if (seenPromptKeys.has(key)) continue;
      accumulated.push(q);
      seenPromptKeys.add(key);
      if (accumulated.length >= input.desiredCount) break;
    }
  }

  // Final fallback: if still short, top up with synthetic questions to match requested count
  if (accumulated.length < input.desiredCount) {
    const needed = input.desiredCount - accumulated.length;
    const extras = mockGenerate({ ...input, desiredCount: needed });
    for (const q of extras) {
      const key = normalizeQuestionKey(q);
      if (seenPromptKeys.has(key)) continue;
      accumulated.push(q);
      seenPromptKeys.add(key);
      if (accumulated.length >= input.desiredCount) break;
    }
  }

  return accumulated.slice(0, input.desiredCount);
}

function buildCompactContext(input: GenerateInput): string {
  if (!input.perPageText || input.perPageText.length === 0) {
    return "PDF is attached below. Extract text from it only.";
  }
  const summaries = input.perPageText.map((p) => summarize(p.text).slice(0, 400));
  return summaries.join("\n\n");
}

function buildPrompt(input: GenerateInput, context: string, opts?: { excludePrompts?: string[] }): string {
  const typeList = input.allowedTypes.join(", ");
  const exclusions = (opts?.excludePrompts || []).filter(Boolean);
  const exclusionNote = exclusions.length
    ? `\nImportant: Do NOT repeat any previously generated questions whose prompts match any of these (case-insensitive): ${JSON.stringify(
        exclusions.slice(0, 50),
      )}`
    : "";
  return `You create exam questions STRICTLY from the provided slide text. Do not invent facts.
Return ONLY JSON array of questions matching this TypeScript shape:
[{"id":"string","type":"single_choice|multiple_choice|short_answer","difficulty":"easy|medium|hard","prompt":"string","options":[{"id":"string","text":"string","isCorrect":boolean}],"shortAnswerAccepted":["string"],"explanation":"string","source":{"pdfName":"${input.pdfName}","evidence":{"pageNumbers":[number],"snippets":["string"]}},"topicTags":["string"]}]
Rules: questions must cite pageNumbers from the context and provide 1-3 short verbatim quotes as snippets from those same pages. Prefer single-page citations for at least 80% of questions. Types allowed: ${typeList}. Desired count: ${input.desiredCount}. Each question must be unique.${exclusionNote}
Context: ${context}`;
}

function summarize(text: string): string {
  return text.split(/\s+/).slice(0, 120).join(" ");
}

function parseQuestionsJson(text: string, input: GenerateInput): Question[] {
  try {
    const cleanedText = normalizeToJsonArray(text);
    const json = JSON.parse(cleanedText);
    const arr = Array.isArray(json) ? json : json.questions;
    type RawOption = { id?: string; text?: string; isCorrect?: boolean };
    type RawEvidence = { pageNumbers?: Array<number>; snippets?: Array<string> };
    type RawSource = { pdfName?: string; evidence?: RawEvidence };
    type RawQuestion = {
      id?: string;
      type?: QuestionType;
      difficulty?: Difficulty;
      prompt?: string;
      options?: RawOption[];
      shortAnswerAccepted?: string[];
      explanation?: string;
      source?: RawSource;
      topicTags?: string[];
    };
    const pageMap: Record<number, string> = Object.fromEntries(
      (input.perPageText || []).map((p) => [p.pageNumber, p.text]),
    );
    const cleaned: Question[] = (arr || []).map((q: RawQuestion) => ({
      id: q.id || randomUUID(),
      type: (q.type || "single_choice") as QuestionType,
      difficulty: (q.difficulty || "easy") as Difficulty,
      prompt: String(q.prompt || ""),
      options: Array.isArray(q.options)
        ? q.options.map((o): { id: string; text: string; isCorrect?: boolean } => ({
            id: o.id || randomUUID(),
            text: String(o.text || ""),
            isCorrect: o.isCorrect,
          }))
        : undefined,
      shortAnswerAccepted: Array.isArray(q.shortAnswerAccepted)
        ? q.shortAnswerAccepted.map((s) => String(s))
        : undefined,
      explanation: typeof q.explanation === "string" ? q.explanation : undefined,
      source: {
        pdfName: (q.source && typeof q.source.pdfName === "string" ? q.source.pdfName : input.pdfName),
        evidence: {
          pageNumbers: Array.isArray(q.source?.evidence?.pageNumbers)
            ? q.source!.evidence!.pageNumbers.filter((n) => typeof n === "number").map((n) => Math.trunc(n))
            : [],
          snippets: Array.isArray(q.source?.evidence?.snippets)
            ? q.source!.evidence!.snippets.map((s) => String(s))
            : [],
        },
      },
      topicTags: Array.isArray(q.topicTags) ? q.topicTags.map((t) => String(t)) : [],
    }));
    // Skip evidence validation if no local page text was provided
    if (!input.perPageText || input.perPageText.length === 0) {
      return cleaned.filter((q) => validateChoiceRules(q));
    }
    return cleaned.filter((q) =>
      validateEvidence({ pdfTextByPage: pageMap, question: q }) && validateChoiceRules(q),
    );
  } catch {
    return [];
  }
}

function normalizeQuestionKey(q: Question): string {
  return q.prompt.trim().toLowerCase();
}

async function backoff<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 300));
    }
  }
  throw last;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function normalizeToJsonArray(text: string): string {
  // Handle cases where the model returns code fences or an object wrapper
  let t = text.trim();
  // Strip Markdown fences
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // If the response contains explanatory text, try to extract the outermost array
  const firstBracket = t.indexOf("[");
  const lastBracket = t.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
    t = t.slice(firstBracket, lastBracket + 1);
  }
  return t;
}

function mockGenerate(input: GenerateInput): Question[] {
  const pageMap: Record<number, string> = Object.fromEntries(
    input.perPageText.map((p) => [p.pageNumber, p.text]),
  );
  const pages = input.perPageText.map((p) => p.pageNumber);
  const firstPage = pages[0] || 1;
  const firstToken = (pageMap[firstPage] || "alpha beta gamma").split(/\s+/)[0] || "Alpha";

  const out: Question[] = [];
  for (let i = 0; i < input.desiredCount; i++) {
    const type: QuestionType = input.allowedTypes[i % input.allowedTypes.length] || "single_choice";
    const difficulty: Difficulty = (Object.keys(input.difficultyMix) as Difficulty[])[
      i % 3
    ];
    if (type === "short_answer") {
      out.push({
        id: randomUUID(),
        type,
        difficulty,
        prompt: `Name a key term from page ${firstPage}.`,
        shortAnswerAccepted: [firstToken.toLowerCase()],
        source: { pdfName: input.pdfName, evidence: { pageNumbers: [firstPage], snippets: [firstToken] } },
        topicTags: ["sample"],
        explanation: "Term appears on the cited page.",
      });
    } else if (type === "multiple_choice") {
      out.push({
        id: randomUUID(),
        type,
        difficulty,
        prompt: `Select terms that appear on page ${firstPage}.`,
        options: [
          { id: randomUUID(), text: firstToken, isCorrect: true },
          { id: randomUUID(), text: `${firstToken}-x`, isCorrect: true },
          { id: randomUUID(), text: "delta" },
          { id: randomUUID(), text: "epsilon" },
        ],
        source: { pdfName: input.pdfName, evidence: { pageNumbers: [firstPage], snippets: [firstToken] } },
        topicTags: ["sample"],
        explanation: "Two correct terms.",
      });
    } else {
      out.push({
        id: randomUUID(),
        type: "single_choice",
        difficulty,
        prompt: `Which term appears on page ${firstPage}?`,
        options: [
          { id: randomUUID(), text: firstToken, isCorrect: true },
          { id: randomUUID(), text: "zeta" },
          { id: randomUUID(), text: "theta" },
        ],
        source: { pdfName: input.pdfName, evidence: { pageNumbers: [firstPage], snippets: [firstToken] } },
        topicTags: ["sample"],
        explanation: "Appears per evidence.",
      });
    }
  }
  return out;
}


