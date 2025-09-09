import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { QuizSet } from "@/lib/types";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });

  const quizzesFile = path.join(dataDir, "quizzes.json");
  const resultsFile = path.join(dataDir, "results.json");

  const sample: QuizSet = {
    id: randomUUID(),
    title: "Sample Quiz",
    pdfName: "sample-slides.pdf",
    createdAt: new Date().toISOString(),
    status: "draft",
    questionCount: 5,
    questions: [
      {
        id: randomUUID(),
        type: "single_choice",
        difficulty: "easy",
        prompt: "Which term appears on page 1?",
        options: [
          { id: randomUUID(), text: "Alpha", isCorrect: true },
          { id: randomUUID(), text: "Beta" },
          { id: randomUUID(), text: "Gamma" },
        ],
        explanation: "Alpha is present as per evidence.",
        shortAnswerAccepted: undefined,
        source: {
          pdfName: "sample-slides.pdf",
          evidence: { pageNumbers: [1], snippets: ["Alpha"] },
        },
        topicTags: ["Introduction"],
      },
    ],
  };

  const quizzes = { quizzes: [sample] };
  const results = { results: [] };

  await fs.writeFile(quizzesFile, JSON.stringify(quizzes, null, 2), "utf-8");
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2), "utf-8");
  console.log("Seeded data/quizzes.json and data/results.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


