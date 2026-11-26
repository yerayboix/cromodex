import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MiniCard, joinCodes } from "@/components/cards";
import { SectionPage, SectionSkeleton } from "@/components/section-page";
import { getCurrentUser } from "@/lib/auth";
import { sinceLabel } from "@/lib/format";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getMyTrades, type MyTradeItem } from "@/server/queries";

export const metadata: Metadata = { title: "Mis tratos" };

export default function MyTradesPage({ params }: PageProps<"/c/[slug]/tratos">) {
  return (
    <SectionPage
      title="Mis tratos"
      intro="Tus cartas en la mesa y tus ofertas, en un solo sitio."
    >
      <Suspense fallback={<SectionSkeleton />}>
        <MyTradesContent params={params} />
      </Suspense>
    </SectionPage>
  );
}

async function MyTradesContent({
  params,
}: {
  params: PageProps<"/c/[slug]/tratos">["params"];
}) {
  const { slug } = await params;
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const { myTurn, waiting, idleListings } = await getMyTrades(collection.id, slug, user.id);

  if (myTurn.length + waiting.length + idleListings.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="max-w-md text-[15px] leading-normal text-muted-table">
          No tienes cartas en la mesa ni ofertas abiertas.
        </p>
        <Link href={paths.board(slug)} className="font-bold underline underline-offset-4">
          Ir a la mesa
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
      <Group title={`Te toca responder (${myTurn.length})`} highlight>
        {myTurn.map((t) => (
          <Row key={t.negotiationId} slug={slug} item={t} />
        ))}
      </Group>
      <Group title={`Esperando respuesta (${waiting.length})`}>
        {waiting.map((t) => (
          <Row key={t.negotiationId} slug={slug} item={t} />
        ))}
      </Group>
      <Group title={`Tus cartas sin ofertas (${idleListings.length})`}>
        {idleListings.map((l) => (
          <RowLink
            key={l.listingId}
            href={paths.card(slug, l.listingId)}
            code={l.code}
            title={`Tu carta ${l.code}`}
            detail={`En la mesa desde ${sinceLabel(l.createdAt)}`}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  title,
  highlight = false,
  children,
}: {
  title: string;
  highlight?: boolean;
  children: React.ReactNode[];
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5 lg:gap-2.5">
      <h2
        className={cn(
          "px-0.5 text-sm font-extrabold lg:text-[15px]",
          highlight ? "text-gold" : "text-muted-table",
        )}
      >
        {title}
      </h2>
      {children.length > 0 ? (
        <ul className="flex flex-col gap-1.5 lg:gap-2">{children}</ul>
      ) : (
        <p className="px-0.5 text-[13px] text-muted-table/80">Nada por aquí.</p>
      )}
    </section>
  );
}

function Row({ slug, item: t }: { slug: string; item: MyTradeItem }) {
  const cards = joinCodes(t.cards);
  const title =
    t.role === "owner" ? `Oferta ${t.alias} por tu ${t.code}` : `Tu oferta por un ${t.code}`;
  const detail =
    t.role === "owner"
      ? t.lastBy === "offerer"
        ? `Te da ${cards}`
        : `Le pediste ${cards}`
      : t.lastBy === "owner"
        ? `Te piden ${cards}`
        : `Ofreces ${cards}`;
  return (
    <RowLink
      href={paths.card(slug, t.listingId)}
      code={t.code}
      title={title}
      detail={detail}
      turn={t.myTurn}
    />
  );
}

function RowLink({
  href,
  code,
  title,
  detail,
  turn = false,
}: {
  href: string;
  code: string;
  title: string;
  detail: string;
  turn?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink lg:px-3.5 lg:py-3",
          turn ? "border-2 border-turn bg-panel" : "border border-line bg-parchment",
        )}
      >
        <MiniCard code={code} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">{title}</span>
          <span className="truncate text-[13px] text-muted-ink">{detail}</span>
        </span>
        <ChevronRight className="size-[18px] shrink-0 text-muted-ink" strokeWidth={2.4} />
      </Link>
    </li>
  );
}
