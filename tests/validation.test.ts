import { describe, it, expect } from "vitest";
import { validateEvidence, matchShortAnswer } from "@/lib/validation";

describe("validateEvidence", () => {
  it("accepts exact matches on cited page", () => {
    const ok = validateEvidence({
      pdfTextByPage: { 1: "Alpha beta gamma" },
      question: {
        id: "q1",
        type: "single_choice",
        difficulty: "easy",
        prompt: "p",
        options: [{ id: "o1", text: "Alpha", isCorrect: true }],
        source: { pdfName: "x.pdf", evidence: { pageNumbers: [1], snippets: ["Alpha"] } },
        topicTags: [],
      },
    });
    expect(ok).toBe(true);
  });
});

describe("matchShortAnswer", () => {
  it("matches normalized strings", () => {
    expect(matchShortAnswer(["machine learning"], "Machine  learning!!")).toBe(true);
  });
});


