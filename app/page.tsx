import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverStore } from "@/lib/store/serverStore";
import { deleteQuizAction, duplicateQuizAction } from "@/app/actions/quizzes";

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const isUserView = sp?.["user"] === "true";
  const quizzes = await serverStore.listQuizzes();
  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lnwza Quiz</h1>
        {!isUserView && (
          <Link href="/create">
            <Button>Create from PDF</Button>
          </Link>
        )}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Recent Quiz Sets</CardTitle>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-sm text-foreground/70">No quizzes yet. Use &quot;Create from PDF&quot; to start.</p>
          ) : (
            <div className="divide-y divide-foreground/10">
              {quizzes.map((q) => (
                <div key={q.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-foreground/70">{new Date(q.createdAt).toLocaleString()} • {q.questionCount} Qs • {q.pdfName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUserView ? (
                      <>
                        <Link href={`/share/${q.id}`}><Button size="sm">Take</Button></Link>
                        <Link href={`/quiz/${q.id}`}><Button size="sm" variant="outline">Review</Button></Link>
                      </>
                    ) : (
                      <>
                        {/* <Link href={`/take/${q.id}`}><Button size="sm">Take</Button></Link> */}
                        <Link href={`/share/${q.id}`}><Button size="sm">Take</Button></Link>
                        <Link href={`/quiz/${q.id}`}><Button size="sm" variant="outline">Review</Button></Link>
                        <form action={async () => { "use server"; await duplicateQuizAction(q.id); }}>
                          <Button size="sm" variant="ghost">Duplicate</Button>
                        </form>
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            const pwd = (formData.get("password") as string) || "";
                            await deleteQuizAction(q.id, pwd);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            className="w-28 rounded-md border border-foreground/20 bg-transparent px-2 py-1 text-xs"
                            required
                          />
                          <Button size="sm" variant="ghost">Delete</Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
