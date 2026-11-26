import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { BigCard, HandCard } from "@/components/cards";
import { SwapIcon } from "@/components/icons";
import { btnGold, btnOutlineTable } from "@/components/ui-classes";
import { getCurrentUser } from "@/lib/auth";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getTrade } from "@/server/queries";

export const metadata: Metadata = { title: "Trato hecho" };

export default function TradeDonePage({ params }: PageProps<"/c/[slug]/trato/[tradeId]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-7.5 px-6 pt-6 pb-8 text-center lg:gap-10 lg:p-12">
      <Suspense fallback={null}>
        <TradeDone params={params} />
      </Suspense>
    </main>
  );
}

async function TradeDone({
  params,
}: {
  params: PageProps<"/c/[slug]/trato/[tradeId]">["params"];
}) {
  const { slug, tradeId } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const trade = await getTrade(tradeId, collection.id, user.id);
  if (!trade) notFound();
  // This screen is for the two people in the trade; others see the log.
  if (!trade.myRole) redirect(paths.log(slug));

  const iAmOwner = trade.myRole === "owner";
  const otherName = iAmOwner ? trade.offererName : trade.ownerName;
  const myName = iAmOwner ? trade.ownerName : trade.offererName;
  const summary = iAmOwner
    ? `Has cambiado tu ${trade.ownerCard} por ${joinWords(trade.offererCards.map((c) => `el ${c}`))} de ${otherName}.`
    : `Has cambiado ${joinWords(trade.offererCards.map((c) => `tu ${c}`))} por el ${trade.ownerCard} de ${otherName}.`;

  const hand = (
    <div className="flex items-center [&>*:not(:first-child)]:-ml-5 lg:[&>*:not(:first-child)]:-ml-6.5 [&>*:nth-child(odd)]:-rotate-8 [&>*:nth-child(even)]:rotate-4">
      {trade.offererCards.map((c, i) => (
        <HandCard key={`${c}-${i}`} code={c} className="lg:hidden" />
      ))}
      {trade.offererCards.map((c, i) => (
        <HandCard key={`lg-${c}-${i}`} code={c} size="lg" className="hidden lg:inline-block" />
      ))}
    </div>
  );
  const card = (
    <>
      <BigCard code={trade.ownerCard} size="sm" className="w-[92px] rotate-6 [--h:120px] lg:hidden" />
      <BigCard code={trade.ownerCard} size="lg" className="hidden rotate-6 lg:block" />
    </>
  );

  return (
    <>
      <div className="grid grid-cols-2 items-end gap-3.5 lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
        <Side name={`${myName} (tú)`}>{iAmOwner ? card : hand}</Side>
        <SwapIcon className="mb-12 hidden size-10 text-muted-table lg:block" />
        <Side name={otherName}>{iAmOwner ? hand : card}</Side>
      </div>
      <div className="flex max-w-[520px] flex-col gap-2.5 lg:gap-3">
        <h1 className="font-display text-4xl leading-tight lg:text-5xl">Trato hecho</h1>
        <p className="text-[17px] leading-[1.45] lg:text-[19px]">{summary}</p>
        <p className="text-[15px] leading-normal text-muted-table lg:text-base">
          Ya aparece en el registro con vuestros nombres. Quedad para daros las cartas.
        </p>
      </div>
      <div className="flex w-full flex-col-reverse gap-2 lg:w-auto lg:flex-row">
        <Link href={paths.board(slug)} className={btnOutlineTable}>
          Volver a la mesa
        </Link>
        <Link href={paths.log(slug)} className={cn(btnGold, "h-[54px] text-[17px] lg:h-[52px] lg:text-base")}>
          Ver en el registro
        </Link>
      </div>
    </>
  );
}

function Side({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 lg:gap-3.5">
      <div className="flex h-[132px] items-center lg:h-[200px]">{children}</div>
      <span className="text-[15px] font-extrabold lg:text-lg">{name}</span>
    </div>
  );
}

/** "a", "a y b", "a, b y c". */
function joinWords(words: string[]) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} y ${words.at(-1)}`;
}
