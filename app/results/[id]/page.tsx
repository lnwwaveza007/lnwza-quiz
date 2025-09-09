import { serverStore } from "@/lib/store/serverStore";
import type { Question } from "@/lib/types";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quiz, attempts] = await Promise.all([
    serverStore.getQuiz(id),
    serverStore.listResults(id),
  ]);
  if (!quiz) return <div className="p-8">Not found</div>;
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Results: {quiz.title}</h1>
      {attempts.length === 0 ? (
        <p className="text-sm text-foreground/70">No attempts yet.</p>
      ) : (
        <div className="space-y-2">
          {attempts.map((a) => (
            <div key={a.id} className="rounded-md border border-foreground/15 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{new Date(a.takenAt).toLocaleString()}</span>
                <span>
                  {a.score.correct}/{a.score.total} ({a.score.percent}%) • {a.durationSec}s
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {attempts.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-semibold">Latest attempt breakdown</h2>
          {(() => {
            const latest = attempts[attempts.length - 1];
            const answerMap = Object.fromEntries(latest.answers.map((r) => [r.questionId, r] as const));
            return quiz.questions.map((q: Question, index: number) => {
              const res = answerMap[q.id] || {} as { selectedOptionIds?: string[]; shortAnswerText?: string; isCorrect?: boolean };
              const selected: string[] = Array.isArray(res.selectedOptionIds) ? res.selectedOptionIds : [];
              const isCorrect = Boolean(res.isCorrect);
              return (
                <div key={q.id} className="rounded-md border border-foreground/15 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm uppercase tracking-wide text-foreground/60">Question {index + 1}</div>
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
            });
          })()}
        </div>
      )}
      <div className="mt-6">
        <a
          href={`/api/export/results/${quiz.id}`}
          className="text-sm underline underline-offset-4"
        >
          Export Results JSON
        </a>
      </div>
    </div>
  );
}


