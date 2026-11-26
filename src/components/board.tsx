import { cn } from "cn";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BoardGrid } from "@/components/board-grid";
import { CompassRose } from "@/components/icons";
import { CollectionMenu } from "@/components/shell/collection-menu";
import { AccountSlot } from "@/components/shell/server-slots";
import { btnGold } from "@/components/ui-classes";
import { getCurrentUser } from "@/lib/auth";
import { paths } from "@/lib/paths";
import { getCollection } from "@/server/collections";
import { getBoard, getMyWantedCodes } from "@/server/queries";

/**
 * The table: every active copy in the collection, without owners. Loaded
 * once by the shared board layout; filtering and the highlighted card are
 * resolved on the client from the URL, so opening a card does not reload it.
 */
export async function Board({ slug }: { slug: string }) {
  const [user, collection] = await Promise.all([getCurrentUser(), getCollection(slug)]);
  const [cards, wanted] = await Promise.all([
    getBoard(collection.id, slug, user.id),
    getMyWantedCodes(collection.id, user.id),
  ]);
  return <BoardGrid slug={slug} cards={cards} wantedCodes={[...wanted]} />;
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
