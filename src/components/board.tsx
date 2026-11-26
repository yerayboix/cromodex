import { cn } from "cn";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CompassRose } from "@/components/icons";
import { CollectionMenu } from "@/components/shell/collection-menu";
import { AccountSlot } from "@/components/shell/server-slots";
import { btnGold } from "@/components/ui-classes";
import { getCurrentUser } from "@/lib/auth";
import { isSpecialCode } from "@/lib/collections";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getBoard, getMyWantedCodes, type BoardCard } from "@/server/queries";

export type BoardFilter = "all" | "missing";

/** The table: every active copy in the collection, without owners. */
export async function Board({
  slug,
  filter = "all",
  selectedId,
  background = false,
}: {
  slug: string;
  filter?: BoardFilter;
  /** Card open in the side panel (desktop). */
  selectedId?: string;
  /** Shown behind a panel or dialog that has the page heading. */
  background?: boolean;
}) {
  const Heading = background ? "h2" : "h1";
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const [all, wantedCodes] = await Promise.all([
    getBoard(collection.id, slug, user.id),
    filter === "missing" ? getMyWantedCodes(collection.id, user.id) : null,
  ]);
  // "Me faltan": wanted codes someone else is offering (not your own copies).
  const cards = wantedCodes
    ? all.filter((c) => !c.isMine && wantedCodes.has(c.code))
    : all;

  if (all.length === 0) return <EmptyBoard slug={slug} background={background} />;

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:items-end lg:gap-4">
        <div className="flex items-baseline gap-3.5">
          <Heading className="sr-only font-display text-[34px] leading-none lg:not-sr-only">
            Mesa
          </Heading>
          <span className="hidden text-[15px] text-muted-table lg:inline">
            {countLabel(all.length)}, ninguna con el nombre de su dueño
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-2 lg:w-auto">
          <nav aria-label="Filtrar la mesa" className="flex gap-1.5">
            <FilterLink href={paths.board(slug)} active={filter === "all"}>
              Todas
            </FilterLink>
            <FilterLink href={paths.missing(slug)} active={filter === "missing"}>
              Me faltan
            </FilterLink>
          </nav>
          <span className="text-[13px] text-muted-table lg:hidden">
            {countLabel(cards.length)}
          </span>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-10">
          <p className="max-w-md text-[15px] leading-normal text-muted-table">
            Ahora mismo no hay ninguna carta de tu lista en la mesa.
          </p>
          <Link
            href={paths.wanted(slug)}
            className="font-bold text-parchment underline underline-offset-4"
          >
            Revisar tus buscadas
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-x-2.5 gap-y-3 lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] lg:gap-x-[18px] lg:gap-y-[22px]">
          {cards.map((card) => (
            <li key={card.id}>
              <CardTile slug={slug} card={card} selected={card.id === selectedId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function countLabel(n: number) {
  return n === 1 ? "1 carta" : `${n} cartas`;
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[38px] items-center rounded-lg px-3.5 text-sm lg:h-10 lg:px-4 lg:text-[15px]",
        active
          ? "bg-parchment font-bold text-ink"
          : "border-[1.5px] border-outline font-semibold text-parchment hover:bg-parchment/5",
      )}
    >
      {children}
    </Link>
  );
}

function offersLabel(card: BoardCard) {
  if (card.hasMyOffer) return "Tu oferta";
  if (card.offerCount === 0) return "Sin ofertas";
  return card.offerCount === 1 ? "1 oferta" : `${card.offerCount} ofertas`;
}

function CardTile({
  slug,
  card,
  selected,
}: {
  slug: string;
  card: BoardCard;
  selected: boolean;
}) {
  const label = offersLabel(card);
  const aria = [
    `Carta ${card.code}`,
    label,
    card.isMine ? "tuya" : null,
    card.myTurn ? "te toca responder" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={paths.card(slug, card.id)}
      aria-label={aria}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative block rounded-[10px] text-ink shadow-card transition-transform hover:-translate-y-0.5",
        selected && "-translate-y-1 outline-3 outline-offset-4 outline-gold",
      )}
    >
      <div
        className={cn(
          "rounded-[10px] p-[3px]",
          isSpecialCode(card.code) ? "frame-special" : "frame-regular",
        )}
      >
        <div className="flex h-[162px] flex-col gap-[5px] rounded-[7px] bg-parchment p-[5px] lg:h-[200px] lg:gap-1.5 lg:p-1.5">
          <div className="bg-card-blank flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[5px]">
            <span aria-hidden="true" className="font-display text-[34px] text-[#d0bc93] lg:text-[40px]">
              {card.code}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1 px-0.5">
            <span className="font-display text-[17px] leading-none lg:text-[19px]">
              {card.code}
            </span>
            <span className="truncate text-xs font-semibold text-muted-ink">{label}</span>
          </div>
        </div>
      </div>
      {card.myTurn ? (
        <Badge className="bg-turn text-white">Te toca</Badge>
      ) : card.isMine ? (
        <Badge className="bg-gold text-ink">Tuya</Badge>
      ) : null}
    </Link>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -top-1.5 -right-1 flex h-[22px] items-center rounded-full px-2 text-xs font-extrabold shadow-[0_2px_0_rgb(4_22_33/0.55)] lg:-top-[7px] lg:-right-[5px] lg:h-6 lg:px-[9px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function EmptyBoard({ slug, background }: { slug: string; background: boolean }) {
  const Heading = background ? "h2" : "h1";
  return (
    <div className="flex flex-1 flex-col">
      <div className="hidden items-baseline gap-3.5 lg:flex">
        <Heading className="font-display text-[34px] leading-none">Mesa</Heading>
        <span className="text-[15px] text-muted-table">0 cartas</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-16 text-center">
        <div aria-hidden="true" className="flex gap-4.5">
          <div className="flex h-[150px] w-[110px] items-center justify-center rounded-xl border-[2.5px] border-dashed border-outline text-muted-table lg:h-[180px] lg:w-[130px]">
            <Plus className="size-9" strokeWidth={2.4} />
          </div>
          <div className="hidden h-[180px] w-[130px] rounded-xl border-2 border-dashed border-outline/45 lg:block" />
          <div className="hidden h-[180px] w-[130px] rounded-xl border-2 border-dashed border-outline/25 lg:block" />
        </div>
        <div className="flex max-w-[460px] flex-col gap-2.5">
          <h2 className="font-display text-2xl leading-tight lg:text-[28px]">
            La mesa está vacía
          </h2>
          <p className="text-[15px] leading-normal text-muted-table lg:text-base">
            Publica tus repetidas para que el resto pueda hacerte ofertas. Nadie verá
            que son tuyas.
          </p>
        </div>
        <Link href={paths.publish(slug)} className={btnGold}>
          <Plus className="size-5" strokeWidth={2.6} />
          Publicar carta
        </Link>
      </div>
    </div>
  );
}

/** Phone header of the board: collection picker and account. */
export function BoardMobileHeader({ slug }: { slug: string }) {
  return (
    <header className="flex items-center justify-between pt-3.5 pr-4 pb-1 pl-4.5 lg:hidden">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold text-muted-table">cromodex</span>
        <CollectionMenu slug={slug} className="text-[22px]" />
      </div>
      <Suspense fallback={<span className="size-10" />}>
        <AccountSlot variant="avatar" />
      </Suspense>
    </header>
  );
}

/** Floating publish button on phones. */
export function PublishFab({ slug }: { slug: string }) {
  return (
    <Link
      href={paths.publish(slug)}
      className={cn(btnGold, "fixed right-4 bottom-[94px] z-10 pr-5 pl-4 lg:hidden")}
    >
      <Plus className="size-5" strokeWidth={2.6} />
      Publicar carta
    </Link>
  );
}

export function TableWatermark() {
  return (
    <CompassRose className="pointer-events-none absolute -bottom-36 -left-28 size-[460px] text-parchment opacity-[0.07]" />
  );
}

export function BoardSkeleton() {
  return (
    <ul
      aria-label="Cargando la mesa"
      className="grid grid-cols-3 gap-x-2.5 gap-y-3 lg:mt-16 lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] lg:gap-x-[18px] lg:gap-y-[22px]"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <li key={i} className="h-[168px] animate-pulse rounded-[10px] bg-parchment/10 lg:h-[206px]" />
      ))}
    </ul>
  );
}
