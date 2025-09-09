"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { QuizResult } from "@/lib/types";
import { submitResultAction } from "@/app/actions/results";
import type { Question, QuizSet } from "@/lib/types";

export default function TakePage() {
  const [quiz, setQuiz] = React.useState<QuizSet | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, { selectedOptionIds?: string[]; shortAnswerText?: string }>>({});
  const [start] = React.useState<number>(Date.now());
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const quizId = (routeParams?.id as string) || "";

  React.useEffect(() => {
    // Simple fetch via export route to avoid bundling server store in client
    if (!quizId) return;
    fetch(`/api/export/quiz/${quizId}`).then((r) => r.json()).then(setQuiz);
  }, [quizId]);

  if (!quiz) return <div className="p-8">Loading...</div>;
  const q = quiz.questions[idx];

  function onSelectOption(optionId: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] || { selectedOptionIds: [] as string[] };
      const set = new Set(cur.selectedOptionIds);
      if (q.type === "single_choice") {
        return { ...prev, [q.id]: { selectedOptionIds: [optionId] } };
      }
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      return { ...prev, [q.id]: { selectedOptionIds: Array.from(set) } };
    });
  }

  async function submit() {
    if (!quiz) return;
    const durationSec = Math.round((Date.now() - start) / 1000);
    const results = quiz.questions.map((question: Question) => {
      const entry = answers[question.id] || {};
      let isCorrect = false;
      if (question.type === "short_answer") {
        const text = (entry.shortAnswerText || "").toLowerCase().trim();
        isCorrect = (question.shortAnswerAccepted || []).some((a: string) => a.toLowerCase() === text);
      } else {
        const selectedSet = new Set(entry.selectedOptionIds || []);
        const correctSet = new Set((question.options || []).filter((o) => o.isCorrect).map((o) => o.id));
        isCorrect = selectedSet.size === correctSet.size && Array.from(selectedSet).every((s) => correctSet.has(s));
      }
      return { questionId: question.id, selectedOptionIds: entry.selectedOptionIds, shortAnswerText: entry.shortAnswerText, isCorrect };
    });
    const score = { correct: results.filter((r) => r.isCorrect).length, total: quiz.questions.length };
    const result: Omit<QuizResult, "id"> = {
      quizId: quiz.id,
      takenAt: new Date().toISOString(),
      durationSec,
      answers: results,
      score: { ...score, percent: Math.round((score.correct / score.total) * 100) },
    };
    await submitResultAction(result);
    router.push(`/results/${quiz.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Question {idx + 1} / {quiz.questions.length}</h1>
      </div>
      <div className="space-y-4">
        <p className="text-lg">{q.prompt}</p>
        {q.type !== "short_answer" ? (
          <div className="space-y-2">
            {(q.options || []).map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input
                  type={q.type === "single_choice" ? "radio" : "checkbox"}
                  name="opt"
                  checked={Boolean(answers[q.id]?.selectedOptionIds?.includes(o.id))}
                  onChange={() => onSelectOption(o.id)}
                />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
            placeholder="Your answer"
            value={answers[q.id]?.shortAnswerText || ""}
            onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: { shortAnswerText: e.target.value } }))}
          />
        )}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
          Previous
        </Button>
        {idx < quiz.questions.length - 1 ? (
          <Button onClick={() => setIdx((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={submit}>Submit</Button>
        )}
      </div>
    </div>
  );
}


