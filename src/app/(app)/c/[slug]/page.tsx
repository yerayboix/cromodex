import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Board,
  BoardMobileHeader,
  BoardSkeleton,
  PublishFab,
  TableWatermark,
} from "@/components/board";

export const metadata: Metadata = { title: "Mesa" };

export default function BoardPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden pb-24 lg:pb-10">
      <TableWatermark />
      <Suspense
        fallback={
          <div className="relative px-4 pt-16 lg:px-9 lg:pt-7.5">
            <BoardSkeleton />
          </div>
        }
      >
        <BoardContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BoardContent({ params, searchParams }: PageProps<"/c/[slug]">) {
  const [{ slug }, { filtro }] = await Promise.all([params, searchParams]);
  return (
    <>
      <BoardMobileHeader slug={slug} />
      <div className="relative flex flex-1 flex-col px-4 pt-2.5 lg:px-9 lg:pt-7.5">
        <Board slug={slug} filter={filtro === "faltan" ? "missing" : "all"} />
      </div>
      <PublishFab slug={slug} />
    </>
  );
}
