import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BigCard, MiniCards, joinCodes } from "@/components/cards";
import { btnOutline, btnPrimary } from "@/components/ui-classes";
import { getCurrentUser } from "@/lib/auth";
import { sinceLabel } from "@/lib/format";
import {
  negotiationTitle,
  proposalLead,
  waitingLabel,
} from "@/lib/negotiation-copy";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getListing, type NegotiationView } from "@/server/queries";
import { previewAccept } from "@/server/trading";

import { NegotiationActions } from "./negotiation-actions";
import { BackToBoard, CardPanel } from "./panel";
import { PanelSkeleton } from "./panel-skeleton";
import { WithdrawListing } from "./withdraw-listing";

export const metadata: Metadata = { title: "Carta" };

export default function CardPage({ params }: PageProps<"/c/[slug]/cards/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <CardDetail params={params} />
    </Suspense>
  );
}

async function CardDetail({ params }: { params: PageProps<"/c/[slug]/cards/[id]">["params"] }) {
  const { slug, id } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const listing = await getListing(id, collection.id, user.id);
  if (!listing) notFound();

  if (listing.status !== "active") {
    return (
      <CardPanel head={<div className="flex"><BackToBoard href={paths.board(slug)} /></div>}>
        <h1 className="font-display text-xl">Carta {listing.code}</h1>
        <p className="text-[15px] leading-normal text-muted-ink">
          {listing.status === "traded"
            ? "Esta carta ya se ha intercambiado y no está en la mesa."
            : "Esta carta se retiró de la mesa."}
        </p>
        <Link href={paths.board(slug)} className={cn(btnPrimary, "mt-2 self-start")}>
          Volver a la mesa
        </Link>
      </CardPanel>
    );
  }

  const { negotiations: negs, isMine } = listing;
  // What accepting would cancel, only for offers waiting on this viewer.
  const previews = new Map(
    await Promise.all(
      negs
        .filter((n) => n.myTurn)
        .map(async (n) => [n.id, await previewAccept(user.id, n.id)] as const),
    ),
  );
  const waitingOnMe = negs.filter((n) => n.myTurn).length;
  const hasMyOffer = negs.some((n) => n.myRole === "offerer");

  return (
    <CardPanel
      head={
        <>
          <div className="flex items-center justify-between pr-1.5 lg:pr-0">
            <BackToBoard href={paths.board(slug)} />
            {isMine && (
              <WithdrawListing
                slug={slug}
                listingId={listing.id}
                code={listing.code}
                openOffers={negs.length}
              />
            )}
          </div>
          <div className="flex items-end gap-4 px-3.5 lg:gap-4.5 lg:px-0">
            <BigCard code={listing.code} className="-rotate-2" />
            <div className="flex flex-col gap-2 pb-1">
              <h1 className="font-display text-2xl leading-tight lg:text-[26px]">
                {isMine ? `Tu carta ${listing.code}` : `Carta ${listing.code}`}
              </h1>
              <p className="text-sm leading-[1.45] text-muted-table">
                En la mesa desde {sinceLabel(listing.createdAt)}.{" "}
                {isMine
                  ? "Nadie sabe que es tuya."
                  : "Todas las ofertas son visibles y anónimas."}
              </p>
            </div>
          </div>
        </>
      }
    >
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-[19px] lg:text-xl">
          {negs.length === 0 ? "Sin ofertas" : negs.length === 1 ? "1 oferta" : `${negs.length} ofertas`}
        </h2>
        {isMine && waitingOnMe > 0 && (
          <span className="text-sm text-muted-ink">
            {waitingOnMe === 1 ? "1 espera tu respuesta" : `${waitingOnMe} esperan tu respuesta`}
          </span>
        )}
      </div>

      {negs.length === 0 && (
        <p className="px-1 text-[15px] leading-normal text-muted-ink">
          {isMine
            ? "Cuando alguien haga una oferta por tu carta aparecerá aquí, sin su nombre."
            : "Nadie ha ofertado todavía."}
        </p>
      )}

      {negs.map((n) => (
        <NegotiationCard
          key={n.id}
          slug={slug}
          listingId={listing.id}
          listingCode={listing.code}
          negotiation={n}
          preview={previews.get(n.id) ?? null}
        />
      ))}

      {!isMine && (
        <Link
          href={paths.offer(slug, listing.id)}
          className={cn(hasMyOffer ? btnOutline : btnPrimary, "mt-auto")}
        >
          {hasMyOffer ? "Hacer otra oferta" : "Hacer una oferta"}
        </Link>
      )}
    </CardPanel>
  );
}

function NegotiationCard({
  slug,
  listingId,
  listingCode,
  negotiation: n,
  preview,
}: {
  slug: string;
  listingId: string;
  listingCode: string;
  negotiation: NegotiationView;
  preview: Awaited<ReturnType<typeof previewAccept>>;
}) {
  return (
    <article
      aria-label={negotiationTitle(n)}
      className={cn(
        "flex flex-col rounded-[14px] px-3.5 py-3",
        n.myTurn
          ? "gap-2.5 border-2 border-turn bg-panel"
          : "gap-2 border border-line bg-panel-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold">{negotiationTitle(n)}</h3>
        {n.myTurn ? (
          <span className="rounded-full bg-turn px-2.5 py-1 text-xs font-extrabold text-white">
            Te toca
          </span>
        ) : (
          <span className="text-[13px] font-semibold text-muted-ink">{waitingLabel(n)}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm text-muted-ink">{proposalLead(n)}</span>
        <MiniCards codes={n.cards} />
      </div>
      {n.myRole === "offerer" && n.lastBy === "owner" && n.lastOfferedCards.length > 0 && (
        <p className="text-[13px] text-muted-ink">
          Ofreciste {joinCodes(n.lastOfferedCards)}. El dueño ha contraofertado.
        </p>
      )}
      {n.myRole !== null && (
        <NegotiationActions
          slug={slug}
          listingId={listingId}
          listingCode={listingCode}
          negotiation={n}
          preview={preview}
        />
      )}
    </article>
  );
}

