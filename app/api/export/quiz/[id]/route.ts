import { NextResponse } from "next/server";
import { serverStore } from "@/lib/store/serverStore";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const quiz = await serverStore.getQuiz(id);
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(JSON.stringify(quiz, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename=quiz_${id}.json`,
    },
  });
}


