"use server";
import { randomUUID } from "crypto";
import { serverStore } from "@/lib/store/serverStore";
import type { QuizResult } from "@/lib/types";

export async function submitResultAction(result: Omit<QuizResult, "id">): Promise<string> {
  const withId: QuizResult = { ...result, id: randomUUID() };
  await serverStore.addResult(withId);
  return withId.id;
}


