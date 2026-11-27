import { cn } from "cn";
import type { Metadata } from "next";
import { Suspense } from "react";

import { MiniCard } from "@/components/cards";
import { SwapIcon } from "@/components/icons";
import { SectionPage, SectionSkeleton } from "@/components/section-page";
import { getCurrentUser } from "@/lib/auth";
import { dayGroupKey, dayLabel, timeLabel } from "@/lib/format";
import { getCollection } from "@/server/collections";
import { getTradeLog, type TradeView } from "@/server/queries";

export const metadata: Metadata = { title: "Registro" };

export default function LogPage({ params }: PageProps<"/c/[slug]/log">) {
  return (
    <SectionPage
      title="Registro"
      intro="Intercambios cerrados. Aquí sí se ve quién cambió con quién."
    >
      <Suspense fallback={<SectionSkeleton />}>
        <LogContent params={params} />
      </Suspense>
    </SectionPage>
  );
}

async function LogContent({ params }: { params: PageProps<"/c/[slug]/log">["params"] }) {
  const { slug } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const log = await getTradeLog(collection.id, user.id);

  if (log.length === 0) {
    return (
      <p className="max-w-md py-6 text-[15px] leading-normal text-muted-table">
        Todavía no se ha cerrado ningún intercambio. Cuando alguien acepte una oferta,
        aparecerá aquí con los dos nombres.
      </p>
    );
  }

  const days = Map.groupBy(log, (t) => dayGroupKey(t.acceptedAt));
  return (
    <div className="flex max-w-[980px] flex-col gap-3.5 lg:gap-6.5">
      {[...days.values()].map((trades) => (
        <section key={dayGroupKey(trades[0].acceptedAt)} className="flex flex-col gap-2 lg:gap-2.5">
          <h2 className="px-0.5 text-sm font-extrabold text-muted-table lg:text-[15px]">
            {dayLabel(trades[0].acceptedAt)}
          </h2>
          <ol className="flex flex-col gap-2 lg:gap-2.5">
            {trades.map((t) => (
              <TradeRow key={t.id} trade={t} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TradeRow({ trade: t }: { trade: TradeView }) {
  const owner = t.myRole === "owner" ? `${t.ownerName} (tú)` : t.ownerName;
  const offerer = t.myRole === "offerer" ? `${t.offererName} (tú)` : t.offererName;
  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[14px] px-3.5 py-3 text-ink lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_64px] lg:gap-4.5 lg:px-5 lg:py-3.5",
        t.myRole ? "border-2 border-gold bg-panel" : "bg-parchment",
      )}
    >
      <div className="flex flex-col items-start gap-1.5 lg:flex-row lg:items-center lg:gap-3">
        <span className="text-[15px] font-extrabold lg:text-base">{owner}</span>
        <MiniCard code={t.ownerCard} />
      </div>
      <span role="img" aria-label="cambió con" className="flex text-muted-ink">
        <SwapIcon className="size-[22px] lg:size-6" />
      </span>
      <div className="flex flex-col items-end gap-1.5 lg:flex-row-reverse lg:items-center lg:justify-start lg:gap-3">
        <span className="text-[15px] font-extrabold lg:text-base">{offerer}</span>
        <span className="flex flex-wrap justify-end gap-1">
          {t.offererCards.map((c, i) => (
            <MiniCard key={`${c}-${i}`} code={c} />
          ))}
        </span>
      </div>
      <time
        dateTime={t.acceptedAt.toISOString()}
        className="col-span-full text-xs text-muted-ink lg:col-span-1 lg:text-right lg:text-[13px]"
      >
        {timeLabel(t.acceptedAt)}
      </time>
    </li>
  );
}
