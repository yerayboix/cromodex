import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getListing } from "@/server/queries";

import { makeOfferAction } from "@/app/(app)/c/[slug]/actions";
import { CardComposer } from "../card-composer";

export const metadata: Metadata = { title: "Hacer una oferta" };

export default function OfferPage({ params }: PageProps<"/c/[slug]/carta/[id]/ofertar">) {
  return (
    <Suspense fallback={null}>
      <Offer params={params} />
    </Suspense>
  );
}

async function Offer({
  params,
}: {
  params: PageProps<"/c/[slug]/carta/[id]/ofertar">["params"];
}) {
  const { slug, id } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const listing = await getListing(id, collection.id, user.id);
  if (!listing) notFound();
  // Your own card or one that left the table: back to the card page.
  if (listing.isMine || listing.status !== "active") redirect(paths.card(slug, id));

  return (
    <CardComposer
      slug={slug}
      title={`Oferta por la carta ${listing.code}`}
      closeHref={paths.card(slug, id)}
      listingCode={listing.code}
      initialCards={[]}
      listingSide="receive"
      fieldLabel="Añadir una carta"
      submitLabel="Enviar oferta"
      action={makeOfferAction.bind(null, slug, id)}
    />
  );
}
