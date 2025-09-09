"use client";
import { openDB, type IDBPDatabase } from "idb";
import type { QuizResult, QuizSet } from "@/lib/types";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB("lnwza_quiz", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("quizzes")) db.createObjectStore("quizzes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("results")) db.createObjectStore("results", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export const browserStore = {
  async listQuizzes(): Promise<QuizSet[]> {
    const db = await getDB();
    const tx = db.transaction("quizzes");
    const store = tx.objectStore("quizzes");
    const all: QuizSet[] = [];
    let cursor = await store.openCursor();
    while (cursor) {
      all.push(cursor.value as QuizSet);
      cursor = await cursor.continue();
    }
    return all;
  },
  async getQuiz(id: string): Promise<QuizSet | undefined> {
    const db = await getDB();
    return (await db.get("quizzes", id)) as QuizSet | undefined;
  },
  async saveQuiz(quiz: QuizSet): Promise<void> {
    const db = await getDB();
    await db.put("quizzes", quiz);
  },
  async deleteQuiz(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("quizzes", id);
  },
  async listResults(quizId: string): Promise<QuizResult[]> {
    const db = await getDB();
    const tx = db.transaction("results");
    const store = tx.objectStore("results");
    const all: QuizResult[] = [];
    let cursor = await store.openCursor();
    while (cursor) {
      const val = cursor.value as QuizResult;
      if (val.quizId === quizId) all.push(val);
      cursor = await cursor.continue();
    }
    return all;
  },
  async addResult(result: QuizResult): Promise<void> {
    const db = await getDB();
    await db.put("results", result);
  },
};

export type BrowserStore = typeof browserStore;


