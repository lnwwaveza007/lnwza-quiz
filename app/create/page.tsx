"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuizFromPdf } from "@/app/actions/quizzes";

export default function CreatePage() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Create from PDF</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upload and Configure</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError(null);
              const form = e.currentTarget as HTMLFormElement;
              const fd = new FormData(form);
              try {
                const id = await createQuizFromPdf(fd);
                router.push(`/quiz/${id}`);
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to generate quiz";
                setError(message);
              } finally {
                setPending(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">PDF File</label>
              <Input type="file" name="pdf" accept="application/pdf" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input name="title" placeholder="Quiz title (default = PDF name)" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" name="password" placeholder="Enter password" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium"># of Questions</label>
              <Input type="number" name="count" min={3} max={100} defaultValue={5} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Types</label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="types" value="single_choice" defaultChecked /> Single Choice</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="types" value="multiple_choice" defaultChecked /> Multiple Choice</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="types" value="short_answer" defaultChecked /> Short Answer</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty Mix (%)</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-foreground/70">Easy</div>
                  <Input type="number" name="mix_easy" min={0} max={100} defaultValue={40} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-foreground/70">Medium</div>
                  <Input type="number" name="mix_medium" min={0} max={100} defaultValue={40} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-foreground/70">Hard</div>
                  <Input type="number" name="mix_hard" min={0} max={100} defaultValue={20} />
                </div>
              </div>
              <p className="text-xs text-foreground/70">
                Set the target percentage of questions by difficulty. The three values should add up to 100.
                For example, 40 / 40 / 20 means roughly 40% easy, 40% medium, and 20% hard.
              </p>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending}>{pending ? "Generating..." : "Generate Quiz"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


