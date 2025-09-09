import { serverStore } from "@/lib/store/serverStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { publishQuizAction } from "@/app/actions/quizzes";
import type { Question } from "@/lib/types";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await serverStore.getQuiz(id);
  if (!quiz) return <div className="p-8">Not found</div>;
  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Review: {quiz.title}</h1>
        <div className="flex gap-2">
          <Link href={`/take/${quiz.id}`}><Button>Take Quiz</Button></Link>
          <Link href={`/api/export/quiz/${quiz.id}`}><Button variant="outline">Export JSON</Button></Link>
          <form action={async () => { "use server"; await publishQuizAction(quiz.id); }}>
            <Button variant="ghost">Publish</Button>
          </form>
        </div>
      </div>
      <p className="text-sm text-foreground/70">Questions: {quiz.questionCount} • PDF: {quiz.pdfName}</p>
      <div className="divide-y divide-foreground/10 rounded-md border border-foreground/15">
        {quiz.questions.map((q: Question, idx: number) => (
          <div key={q.id} className="p-4 text-sm">
            <div className="mb-1 text-xs uppercase tracking-wide text-foreground/60">Question {idx + 1}</div>
            <div className="text-base">{q.prompt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


