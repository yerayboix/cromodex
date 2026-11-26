import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { joinCodes } from "@/components/cards";
import { getCurrentUser } from "@/lib/auth";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getListing } from "@/server/queries";

import { counterOfferAction } from "@/app/(app)/c/[slug]/actions";
import { CardComposer } from "../../card-composer";
import { ComposerSkeleton } from "../../panel-skeleton";

export const metadata: Metadata = { title: "Contraoferta" };

type Props = PageProps<"/c/[slug]/carta/[id]/contraoferta/[negotiationId]">;

export default function CounterPage({ params }: Props) {
  return (
    <Suspense fallback={<ComposerSkeleton />}>
      <Counter params={params} />
    </Suspense>
  );
}

async function Counter({ params }: { params: Props["params"] }) {
  const { slug, id, negotiationId } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const listing = await getListing(id, collection.id, user.id);
  if (!listing) notFound();
  const negotiation = listing.negotiations.find((n) => n.id === negotiationId);
  // Closed meanwhile, or not your turn: the card page explains the state.
  if (!negotiation || !negotiation.myTurn) redirect(paths.card(slug, id));

  const asOwner = negotiation.myRole === "owner";
  const current = joinCodes(negotiation.cards);
  return (
    <CardComposer
      slug={slug}
      title={
        asOwner
          ? `Contraoferta a la oferta ${negotiation.alias}`
          : `Contraoferta por la carta ${listing.code}`
      }
      intro={
        asOwner
          ? `Ahora te ofrecen ${current}. Pide la combinación que quieras.`
          : `Te piden ${current}. Ofrece la combinación que quieras.`
      }
      closeHref={paths.card(slug, id)}
      listingCode={listing.code}
      initialCards={negotiation.cards}
      listingSide={asOwner ? "give" : "receive"}
      fieldLabel={asOwner ? "Pedir otra carta" : "Añadir una carta"}
      submitLabel="Enviar contraoferta"
      action={counterOfferAction.bind(null, slug, id, negotiationId)}
    />
  );
}
