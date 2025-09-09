"use server";
import { randomUUID } from "crypto";
import { serverStore } from "@/lib/store/serverStore";
import { generateQuestions } from "@/lib/ai/generateQuestions";
import type { QuestionType, QuizSet } from "@/lib/types";

const ADMIN_PASSWORD = "charana";

export async function createQuizFromPdf(formData: FormData): Promise<string> {
  const file = formData.get("pdf") as File | null;
  const title = (formData.get("title") as string) || file?.name || "Untitled Quiz";
  const desiredCount = parseInt((formData.get("count") as string) || "5", 10);
  const difficultyMix = {
    easy: Number(formData.get("mix_easy") || 40),
    medium: Number(formData.get("mix_medium") || 40),
    hard: Number(formData.get("mix_hard") || 20),
  } as const;
  const allowedTypes = (formData.getAll("types") as string[]).filter(Boolean) as QuestionType[];
  const password = (formData.get("password") as string) || "";

  if (password !== ADMIN_PASSWORD) throw new Error("Invalid password");
  if (!file) throw new Error("PDF is required");
  const ab = await file.arrayBuffer();
  const u8 = new Uint8Array(ab);

  const questions = await generateQuestions({
    pdfName: file.name,
    pdfBytes: u8,
    pdfMime: file.type || "application/pdf",
    perPageText: [],
    desiredCount,
    allowedTypes: allowedTypes.length ? allowedTypes : ["single_choice", "multiple_choice", "short_answer"],
    difficultyMix,
  });

  const quiz: QuizSet = {
    id: randomUUID(),
    title,
    pdfName: file.name,
    createdAt: new Date().toISOString(),
    questionCount: questions.length,
    questions,
    status: "draft",
  };
  await serverStore.saveQuiz(quiz);
  return quiz.id;
}

export async function deleteQuizAction(id: string, password?: string): Promise<void> {
  if ((password || "") !== ADMIN_PASSWORD) throw new Error("Invalid password");
  await serverStore.deleteQuiz(id);
}

export async function duplicateQuizAction(id: string): Promise<string> {
  const q = await serverStore.getQuiz(id);
  if (!q) throw new Error("Quiz not found");
  const copy: QuizSet = {
    ...q,
    id: randomUUID(),
    title: q.title + " (Copy)",
    createdAt: new Date().toISOString(),
    status: "draft",
  };
  await serverStore.saveQuiz(copy);
  return copy.id;
}

export async function publishQuizAction(id: string): Promise<void> {
  const q = await serverStore.getQuiz(id);
  if (!q) throw new Error("Quiz not found");
  q.status = "published";
  await serverStore.saveQuiz(q);
}


