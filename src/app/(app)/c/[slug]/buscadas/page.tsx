import type { Metadata } from "next";
import { Suspense } from "react";

import { MiniCard } from "@/components/cards";
import { SectionPage, SectionSkeleton } from "@/components/section-page";
import { getCurrentUser } from "@/lib/auth";
import { getCollection } from "@/server/collections";
import { getWanted } from "@/server/queries";

import { addWantedAction, removeWantedAction } from "../actions";
import { WantedForm, WantedList } from "./wanted-client";

export const metadata: Metadata = { title: "Buscadas" };

export default function WantedPage({ params }: PageProps<"/c/[slug]/buscadas">) {
  return (
    <SectionPage
      title="Buscadas"
      intro="Nadie ve qué cartas buscas tú; solo cuántos buscan cada una."
    >
      <Suspense fallback={<SectionSkeleton />}>
        <WantedContent params={params} />
      </Suspense>
    </SectionPage>
  );
}

async function WantedContent({ params }: { params: PageProps<"/c/[slug]/buscadas">["params"] }) {
  const { slug } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const { mine, group } = await getWanted(collection.id, slug, user.id);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-7">
      <section
        aria-labelledby="my-wanted"
        className="flex flex-col gap-3 rounded-2xl bg-parchment p-3.5 text-ink lg:gap-4 lg:rounded-[18px] lg:px-5.5 lg:pt-5 lg:pb-5.5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="my-wanted" className="font-display text-lg lg:text-[21px]">
            Tu lista ({mine.length})
          </h2>
          <span className="text-[13px] text-muted-ink">Se usa en «Me faltan»</span>
        </div>
        {mine.length > 0 ? (
          <>
            <WantedList
              items={mine}
              remove={removeWantedAction.bind(null, slug)}
            />
            <p className="flex items-center gap-1.5 text-[13px] text-muted-ink">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-ok" />
              Hay al menos una en la mesa. Pulsa una carta para quitarla.
            </p>
          </>
        ) : (
          <p className="text-sm leading-normal text-muted-ink">
            Añade las cartas que te faltan y usa el filtro «Me faltan» de la mesa
            para encontrarlas.
          </p>
        )}
        <WantedForm slug={slug} action={addWantedAction.bind(null, slug)} />
      </section>

      <section aria-labelledby="group-wanted" className="flex flex-col gap-2 lg:gap-2.5">
        <h2 id="group-wanted" className="px-0.5 font-display text-lg lg:text-[21px]">
          Lo que busca el grupo
        </h2>
        {group.length > 0 ? (
          <ol className="flex flex-col overflow-hidden rounded-[14px] bg-parchment text-ink lg:rounded-2xl">
            {group.map((g) => (
              <li
                key={g.code}
                className="flex items-center gap-3 border-t border-[#dccba6] px-3.5 py-2 first:border-t-0 lg:gap-3.5 lg:px-4.5 lg:py-2.5"
              >
                <MiniCard code={g.code} size="sm" />
                <span className="flex-1 text-[15px] font-bold">Buscada por {g.wantedBy}</span>
                <span className="text-[13px] text-muted-ink lg:text-sm">
                  {g.onTable === 0 ? "Ninguna en la mesa" : `${g.onTable} en la mesa`}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-0.5 text-sm text-muted-table">
            Nadie del grupo ha apuntado cartas todavía.
          </p>
        )}
      </section>
    </div>
  );
}
