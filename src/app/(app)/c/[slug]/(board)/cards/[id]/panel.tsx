import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";

/*
 * Layout pieces of the card panel: a table-coloured head with the card,
 * and a parchment sheet with the negotiations or the composer.
 */

export function CardPanel({
  head,
  children,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-1.5 pt-2.5 pb-4.5 lg:bg-chart-fine lg:px-5.5 lg:pt-3.5 lg:pb-5.5">
        {head}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 rounded-t-[22px] bg-parchment px-4 pt-4 pb-6 text-ink lg:rounded-none lg:px-5.5 lg:pt-5">
        {children}
      </div>
    </div>
  );
}

/** "‹ Mesa" on phones, a close cross on desktop. */
export function BackToBoard({ href }: { href: string }) {
  return (
    <>
      <Link
        href={href}
        className="flex h-11 items-center gap-1 pr-3 pl-2 text-base font-bold lg:hidden"
      >
        <ChevronLeft className="size-[22px]" strokeWidth={2.4} />
        Mesa
      </Link>
      <Link
        href={href}
        aria-label="Cerrar y volver a la mesa"
        className="-ml-2.5 hidden size-10 items-center justify-center lg:flex"
      >
        <X className="size-[22px]" strokeWidth={2.4} />
      </Link>
    </>
  );
}

/** Close button of a composer, with the composer title. */
export function ComposerTitle({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 lg:gap-1.5">
      <Link
        href={href}
        aria-label="Cerrar sin enviar"
        className="flex size-11 shrink-0 items-center justify-center lg:-ml-2.5 lg:size-10"
      >
        <X className="size-[22px]" strokeWidth={2.4} />
      </Link>
      <h1 className="font-display text-[21px] leading-tight lg:text-[22px]">{children}</h1>
    </div>
  );
}
