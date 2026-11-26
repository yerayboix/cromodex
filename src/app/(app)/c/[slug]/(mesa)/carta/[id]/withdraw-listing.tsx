"use client";

import { useActionState, useState } from "react";

import { BigCard } from "@/components/cards";
import { Modal } from "@/components/modal";
import { btnDanger, btnGhost } from "@/components/ui-classes";

import { withdrawListingAction, type ActionState } from "@/app/(app)/c/[slug]/actions";

export function WithdrawListing({
  slug,
  listingId,
  code,
  openOffers,
}: {
  slug: string;
  listingId: string;
  code: string;
  openOffers: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState>(
    () => withdrawListingAction(slug, listingId),
    {},
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center rounded-lg border-[1.5px] border-outline px-3.5 text-sm font-bold lg:h-[38px]"
      >
        Retirar carta
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="withdraw-title" alert placement="center">
        <form action={action} className="flex flex-col gap-3.5 px-5 pt-5.5 pb-4 lg:px-7 lg:pt-6.5 lg:pb-5.5">
          <div className="flex items-center gap-3.5">
            <BigCard code={code} className="w-[58px] text-xs [--h:78px]" size="sm" />
            <h2 id="withdraw-title" className="font-display text-[22px] leading-tight lg:text-2xl">
              Retirar tu carta {code}
            </h2>
          </div>
          <p className="text-[15px] leading-normal">
            La carta desaparecerá de la mesa
            {openOffers === 0
              ? "."
              : openOffers === 1
                ? " y se cancelará la oferta abierta sobre ella."
                : ` y se cancelarán las ${openOffers} ofertas abiertas sobre ella.`}
          </p>
          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5 pt-1 lg:flex-row-reverse">
            <button type="submit" disabled={pending} className={btnDanger}>
              {pending ? "Retirando…" : "Retirar carta"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
              Volver
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
