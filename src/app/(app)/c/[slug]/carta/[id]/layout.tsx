import { Suspense } from "react";

import { Board, BoardSkeleton, TableWatermark } from "@/components/board";

/**
 * A card and its negotiations. Desktop keeps the board on the left with
 * the card highlighted and shows the card in a side panel; phones show
 * only the panel, full screen.
 */
export default function CardLayout({
  children,
  params,
}: LayoutProps<"/c/[slug]/carta/[id]">) {
  return (
    <div className="flex flex-1">
      <div className="relative hidden min-w-0 flex-1 overflow-hidden px-9 pt-7.5 pb-10 lg:block">
        <TableWatermark />
        <div className="relative">
          <Suspense fallback={<BoardSkeleton />}>
            <SelectedBoard params={params} />
          </Suspense>
        </div>
      </div>
      <div className="flex w-full flex-col lg:sticky lg:top-0 lg:h-dvh lg:w-[464px] lg:shrink-0 lg:overflow-y-auto lg:bg-parchment lg:shadow-[-8px_0_0_rgb(4_22_33/0.35)]">
        {children}
      </div>
    </div>
  );
}

async function SelectedBoard({
  params,
}: {
  params: LayoutProps<"/c/[slug]/carta/[id]">["params"];
}) {
  const { slug, id } = await params;
  return <Board slug={slug} selectedId={id} background />;
}
