import { promises as fs } from "fs";
import path from "path";
import type { QuizResult, QuizSet } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const QUIZZES_FILE = path.join(DATA_DIR, "quizzes.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const file of [QUIZZES_FILE, RESULTS_FILE]) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify({ quizzes: [], results: [] }, null, 2), "utf-8");
    }
  }
}

async function readJSON<T>(file: string, key: string): Promise<T[]> {
  await ensureFiles();
  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw || "{}");
  return Array.isArray(parsed[key]) ? parsed[key] : [];
}

async function writeJSON<T>(file: string, key: string, data: T[]): Promise<void> {
  await ensureFiles();
  const content = JSON.stringify({ [key]: data }, null, 2);
  await fs.writeFile(file, content, "utf-8");
}

export const serverStore = {
  async listQuizzes(): Promise<QuizSet[]> {
    return readJSON<QuizSet>(QUIZZES_FILE, "quizzes");
  },
  async getQuiz(id: string): Promise<QuizSet | undefined> {
    const all = await readJSON<QuizSet>(QUIZZES_FILE, "quizzes");
    return all.find((q) => q.id === id);
  },
  async saveQuiz(quiz: QuizSet): Promise<void> {
    const all = await readJSON<QuizSet>(QUIZZES_FILE, "quizzes");
    const idx = all.findIndex((q) => q.id === quiz.id);
    if (idx >= 0) all[idx] = quiz;
    else all.push(quiz);
    await writeJSON(QUIZZES_FILE, "quizzes", all);
  },
  async deleteQuiz(id: string): Promise<void> {
    const all = await readJSON<QuizSet>(QUIZZES_FILE, "quizzes");
    const remaining = all.filter((q) => q.id !== id);
    await writeJSON(QUIZZES_FILE, "quizzes", remaining);
  },
  async listResults(quizId: string): Promise<QuizResult[]> {
    const all = await readJSON<QuizResult>(RESULTS_FILE, "results");
    return all.filter((r) => r.quizId === quizId);
  },
  async addResult(result: QuizResult): Promise<void> {
    const all = await readJSON<QuizResult>(RESULTS_FILE, "results");
    all.push(result);
    await writeJSON(RESULTS_FILE, "results", all);
  },
};

export type ServerStore = typeof serverStore;


