"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Question, QuizSet } from "@/lib/types";

export default function ShareTakePage() {
  const [quiz, setQuiz] = React.useState<QuizSet | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, { selectedOptionIds?: string[]; shortAnswerText?: string }>>({});
  const [start] = React.useState<number>(Date.now());
  const [summary, setSummary] = React.useState<null | {
    answersById: Record<string, { selectedOptionIds?: string[]; shortAnswerText?: string; isCorrect: boolean }>;
    durationSec: number;
    score: { correct: number; total: number; percent: number };
  }>(null);
  const routeParams = useParams<{ id: string }>();
  const quizId = (routeParams?.id as string) || "";

  React.useEffect(() => {
    if (!quizId) return;
    fetch(`/api/export/quiz/${quizId}`).then((r) => r.json()).then(setQuiz);
  }, [quizId]);

  if (!quiz) return <div className="p-8">Loading...</div>;
  if (summary) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="mb-4 text-xl font-semibold">Your Result (Not Saved)</h1>
        <p className="mb-6 text-sm text-foreground/70">
          This summary is only shown here and is not stored on the server.
        </p>
        <div className="mb-6 text-sm">
          <div>Score: {summary.score.correct} / {summary.score.total} ({summary.score.percent}%)</div>
          <div>Duration: {summary.durationSec}s</div>
        </div>
        <div className="space-y-6">
          {quiz.questions.map((q: Question, i: number) => {
            const res: { selectedOptionIds?: string[]; shortAnswerText?: string; isCorrect?: boolean } = summary.answersById[q.id] || {};
            const isCorrect = Boolean(res.isCorrect);
            const selected: string[] = Array.isArray(res.selectedOptionIds) ? res.selectedOptionIds : [];
            return (
              <div key={q.id} className="rounded-md border border-foreground/15 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm uppercase tracking-wide text-foreground/60">Question {i + 1}</div>
                  <div className={`text-sm ${isCorrect ? "text-green-600" : "text-red-600"}`}>{isCorrect ? "Correct" : "Incorrect"}</div>
                </div>
                <div className="mb-3 text-base">{q.prompt}</div>
                {q.type !== "short_answer" ? (
                  <div className="mb-3 space-y-1">
                    {(q.options || []).map((o) => {
                      const chosen = selected.includes(o.id);
                      const right = Boolean(o.isCorrect);
                      return (
                        <div key={o.id} className="flex items-center gap-2 text-sm">
                          <input
                            type={q.type === "single_choice" ? "radio" : "checkbox"}
                            checked={chosen}
                            readOnly
                          />
                          <span className={`${right ? "font-medium" : ""}`}>{o.text}</span>
                          {right && <span className="text-xs text-green-600">(correct)</span>}
                          {chosen && !right && <span className="text-xs text-red-600">(your choice)</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mb-3 text-sm">
                    <div>Your answer: <span className="font-medium">{res.shortAnswerText || ""}</span></div>
                    <div>Accepted: {(q.shortAnswerAccepted || []).join(", ")}</div>
                  </div>
                )}
                {q.explanation && (
                  <div className="mt-2 rounded-md bg-foreground/5 p-3 text-sm">
                    <div className="mb-1 font-medium">Why this is correct</div>
                    <div className="whitespace-pre-wrap text-foreground/90">{q.explanation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6">
          <Button onClick={() => { setSummary(null); setIdx(0); setAnswers({}); }}>
            Retake
          </Button>
        </div>
      </div>
    );
  }

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

  function computeAndShowSummary() {
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
    const summaryData = {
      answersById: Object.fromEntries(results.map((r) => [r.questionId, r] as const)),
      durationSec,
      score: { ...score, percent: Math.round((score.correct / score.total) * 100) },
    };
    setSummary(summaryData);
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
          <Button onClick={computeAndShowSummary}>Finish</Button>
        )}
      </div>
    </div>
  );
}
