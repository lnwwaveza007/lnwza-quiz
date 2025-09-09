import { describe, it, expect } from "vitest";
import { serverStore } from "@/lib/store/serverStore";
import { randomUUID } from "crypto";

describe("serverStore roundtrip", () => {
  it("saves and reads a quiz", async () => {
    const id = randomUUID();
    await serverStore.saveQuiz({
      id,
      title: "RT Quiz",
      pdfName: "x.pdf",
      createdAt: new Date().toISOString(),
      questionCount: 0,
      questions: [],
      status: "draft",
    });
    const found = await serverStore.getQuiz(id);
    expect(found?.id).toBe(id);
    await serverStore.deleteQuiz(id);
  });
});


