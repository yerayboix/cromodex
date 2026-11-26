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

export default async function BoardPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden pb-24 lg:pb-10">
      <TableWatermark />
      <BoardMobileHeader slug={slug} />
      <div className="relative flex flex-1 flex-col px-4 pt-2.5 lg:px-9 lg:pt-7.5">
        <Suspense fallback={<BoardSkeleton />}>
          <FilteredBoard slug={slug} searchParams={searchParams} />
        </Suspense>
      </div>
      <PublishFab slug={slug} />
    </main>
  );
}

async function FilteredBoard({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/c/[slug]">["searchParams"];
}) {
  const { filtro } = await searchParams;
  return <Board slug={slug} filter={filtro === "faltan" ? "missing" : "all"} />;
}
