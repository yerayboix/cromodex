"use client";

import { cn } from "cn";
import { ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Modal, SheetHandle } from "@/components/modal";
import { COLLECTIONS } from "@/lib/collections";
import { paths } from "@/lib/paths";

/** Collection name with a picker to switch to another collection. */
export function CollectionMenu({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = COLLECTIONS[slug as keyof typeof COLLECTIONS];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Cambiar de colección. Actual: ${current.shortName}`}
        className={cn("text-left font-display leading-[1.15] text-parchment", className)}
      >
        {current.shortName}{" "}
        <ChevronDown className="inline size-[18px] align-[-2px]" strokeWidth={2.6} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="collections-title">
        <div className="flex flex-col gap-4 px-5 pt-3 pb-7 lg:pt-5">
          <SheetHandle />
          <div className="flex items-center justify-between">
            <h2 id="collections-title" className="font-display text-[22px]">
              Colecciones
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="-mr-2 flex size-11 items-center justify-center"
            >
              <X className="size-[22px]" strokeWidth={2.4} />
            </button>
          </div>
          <p className="text-sm leading-normal text-muted-ink">
            Cada colección tiene su propia mesa, sus ofertas y su registro.
          </p>
          <ul className="flex flex-col gap-2">
            {Object.entries(COLLECTIONS).map(([key, c]) => (
              <li key={key}>
                <Link
                  href={paths.board(key)}
                  onClick={() => setOpen(false)}
                  aria-current={key === slug ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3.5 rounded-[14px] bg-panel p-3",
                    key === slug ? "border-2 border-table" : "border border-line",
                  )}
                >
                  <span
                    aria-hidden="true"
                    data-theme={c.theme}
                    className="bg-chart flex h-16 w-[52px] shrink-0 items-center justify-center rounded-lg"
                  >
                    <span className="frame-regular rounded p-[1.5px]">
                      <span className="flex h-[34px] w-6 items-end rounded-[3px] bg-parchment px-[3px] py-0.5 font-display text-[9px] text-ink">
                        {c.codes[87] ?? c.codes[0]}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-display text-lg leading-tight">{c.shortName}</span>
                    <span className="text-[13px] text-muted-ink">{c.blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}
