"use client";

import { cn } from "cn";
import { usePathname } from "next/navigation";

import { CompassRose } from "@/components/icons";
import { paths } from "@/lib/paths";

/**
 * Column that holds the board in the shared board layout. On phones it is
 * the whole screen on the board and hides behind a card or the publish form;
 * on desktop it stays visible next to the panel. The phone header and the
 * publish button only belong to the board itself.
 */
export function BoardArea({
  slug,
  header,
  fab,
  children,
}: {
  slug: string;
  header: React.ReactNode;
  fab: React.ReactNode;
  children: React.ReactNode;
}) {
  const onBoard = usePathname() === paths.board(slug);
  return (
    <div
      className={cn(
        "relative min-w-0 flex-1 flex-col overflow-hidden pb-24 lg:flex lg:pb-10",
        onBoard ? "flex" : "hidden",
      )}
    >
      <CompassRose className="pointer-events-none absolute -bottom-36 -left-28 size-[460px] text-parchment opacity-[0.07]" />
      {onBoard && header}
      <div className="relative flex flex-1 flex-col px-4 pt-2.5 lg:px-9 lg:pt-7.5">
        {children}
      </div>
      {onBoard && fab}
    </div>
  );
}
