import { Suspense } from "react";

import { Board, BoardMobileHeader, BoardSkeleton, PublishFab } from "@/components/board";
import { BoardArea } from "@/components/board-area";

/**
 * Shared by the board, a card's panel and the publish form, so the board
 * stays mounted (no reload, no skeleton) when you open or close a card.
 */
export default function TableLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <main className="relative flex flex-1">
      <Suspense fallback={<BoardLoading />}>
        <TableBoard params={params} />
      </Suspense>
      {children}
    </main>
  );
}

async function TableBoard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <BoardArea
      slug={slug}
      header={<BoardMobileHeader slug={slug} />}
      fab={<PublishFab slug={slug} />}
    >
      <Suspense fallback={<BoardSkeleton />}>
        <Board slug={slug} />
      </Suspense>
    </BoardArea>
  );
}

function BoardLoading() {
  return (
    <div className="relative hidden flex-1 px-4 pt-16 lg:block lg:px-9 lg:pt-7.5">
      <BoardSkeleton />
    </div>
  );
}
