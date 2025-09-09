import { NextResponse } from "next/server";
import { serverStore } from "@/lib/store/serverStore";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const results = await serverStore.listResults(id);
  return new NextResponse(JSON.stringify(results, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename=results_${id}.json`,
    },
  });
}


