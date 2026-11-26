import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Board, BoardSkeleton } from "@/components/board";
import { paths } from "@/lib/paths";

import { PublishForm } from "./publish-form";

export const metadata: Metadata = { title: "Publicar carta" };

/**
 * Phones: a full-screen form. Desktop: a window over the board.
 */
export default function PublishPage({ params }: PageProps<"/c/[slug]/publicar">) {
  return (
    <main className="relative flex flex-1 flex-col">
      <Suspense fallback={null}>
        <PublishContent params={params} />
      </Suspense>
    </main>
  );
}

async function PublishContent({
  params,
}: {
  params: PageProps<"/c/[slug]/publicar">["params"];
}) {
  const { slug } = await params;
  return (
    <>
      <div aria-hidden="true" inert className="hidden px-9 pt-7.5 lg:block">
        <Suspense fallback={<BoardSkeleton />}>
          <Board slug={slug} background />
        </Suspense>
      </div>
      <div className="flex flex-1 flex-col lg:fixed lg:inset-0 lg:z-30 lg:items-center lg:justify-center lg:bg-[rgb(4_22_33/0.62)]">
        <header className="flex items-center gap-1 pt-2.5 pr-3 pl-1.5 lg:hidden">
          <Link
            href={paths.board(slug)}
            aria-label="Cerrar sin publicar"
            className="flex size-11 items-center justify-center"
          >
            <X className="size-[22px]" strokeWidth={2.4} />
          </Link>
          <h1 className="font-display text-[21px]">Publicar carta</h1>
        </header>
        <section
          className="flex flex-1 flex-col lg:w-[820px] lg:flex-none lg:overflow-hidden lg:rounded-[20px] lg:bg-parchment lg:shadow-[0_6px_0_rgb(4_22_33/0.5)]"
        >
          <PublishForm slug={slug} />
        </section>
      </div>
    </>
  );
}
