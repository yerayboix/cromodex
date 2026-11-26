"use client";

import { cn } from "cn";
import Link from "next/link";
import { useActionState, useState } from "react";

import { BigCard, HandCard, MiniCards, joinCodes } from "@/components/cards";
import { SwapIcon } from "@/components/icons";
import { Modal, SheetHandle } from "@/components/modal";
import { btnDanger, btnGhost } from "@/components/ui-classes";
import { paths } from "@/lib/paths";
import type { NegotiationView } from "@/server/queries";

import {
  acceptOfferAction,
  rejectOfferAction,
  withdrawNegotiationAction,
  type ActionState,
} from "../../actions";

type Preview = {
  otherOffers: number;
  conflicts: { code: string; cards: string[] }[];
} | null;

type Props = {
  slug: string;
  listingId: string;
  listingCode: string;
  negotiation: NegotiationView;
  preview: Preview;
};

/** Accept, counter and reject when it is my turn; otherwise, leave. */
export function NegotiationActions(props: Props) {
  const { slug, listingId, negotiation: n } = props;
  const [dialog, setDialog] = useState<"accept" | "reject" | "leave" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      {n.myTurn ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setDialog("accept")}
            className="h-11 rounded-[10px] bg-table text-[15px] font-extrabold text-parchment"
          >
            Aceptar
          </button>
          <Link
            href={paths.counter(slug, listingId, n.id)}
            className="flex h-11 items-center justify-center rounded-[10px] border-[1.5px] border-ink text-[15px] font-bold"
          >
            Contraofertar
          </Link>
          <button
            type="button"
            onClick={() => setDialog("reject")}
            className="h-11 rounded-[10px] text-[15px] font-bold text-danger hover:bg-danger/5"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDialog("leave")}
          className="h-9 self-start text-sm font-bold text-danger"
        >
          {n.myRole === "owner" ? "Retirarte de esta negociación" : "Retirar tu oferta"}
        </button>
      )}

      <Modal open={dialog === "accept"} onClose={close} labelledBy={`accept-${n.id}`} describedBy={`accept-warning-${n.id}`}>
        <AcceptDialog {...props} onClose={close} />
      </Modal>
      <Modal open={dialog === "reject"} onClose={close} labelledBy={`reject-${n.id}`} alert placement="center">
        <RejectDialog {...props} onClose={close} />
      </Modal>
      <Modal open={dialog === "leave"} onClose={close} labelledBy={`leave-${n.id}`} alert placement="center">
        <LeaveDialog {...props} onClose={close} />
      </Modal>
    </>
  );
}

function ErrorLine({ state }: { state: ActionState }) {
  return state.error ? (
    <p role="alert" className="text-sm text-danger">
      {state.error}
    </p>
  ) : null;
}

function AcceptDialog({
  slug,
  listingCode,
  negotiation: n,
  preview,
  onClose,
}: Props & { onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState>(
    () => acceptOfferAction(slug, n.id),
    {},
  );
  const asOwner = n.myRole === "owner";
  const title = asOwner ? `Aceptar la oferta ${n.alias}` : "Aceptar la contraoferta";
  const handCards = (
    <div className="flex items-center [&>*:not(:first-child)]:-ml-4 [&>*:nth-child(odd)]:-rotate-6 [&>*:nth-child(even)]:rotate-5">
      {n.cards.map((c, i) => (
        <HandCard key={`${c}-${i}`} code={c} size="sm" />
      ))}
    </div>
  );
  const listingCard = <BigCard code={listingCode} size="sm" className={asOwner ? "-rotate-4" : "rotate-3"} />;
  const others = preview?.otherOffers ?? 0;
  const conflicts = preview?.conflicts ?? [];

  return (
    <form action={action} className="flex flex-col gap-4 px-5 pt-3 pb-6 lg:gap-4 lg:px-7 lg:pt-6.5 lg:pb-5.5">
      <SheetHandle />
      <h2 id={`accept-${n.id}`} className="font-display text-2xl leading-tight lg:text-[26px]">
        {title}
      </h2>

      <div className="bg-chart-fine grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl px-2.5 py-4.5 text-parchment">
        <div className="flex flex-col items-center gap-2">
          <div className="flex min-h-[112px] items-center">{asOwner ? listingCard : handCards}</div>
          <span className="text-[13px] text-muted-table">Das</span>
        </div>
        <SwapIcon className="mb-6 size-[26px] text-muted-table" />
        <div className="flex flex-col items-center gap-2">
          <div className="flex min-h-[112px] items-center">{asOwner ? handCards : listingCard}</div>
          <span className="text-[13px] text-muted-table">Recibes</span>
        </div>
      </div>

      <div
        id={`accept-warning-${n.id}`}
        className="flex flex-col gap-1 rounded-[14px] border-[1.5px] border-danger bg-danger-soft px-4 py-3.5 text-danger-ink"
      >
        <p className="text-base leading-snug font-extrabold">Esta acción no se puede deshacer.</p>
        <p className="text-[15px] leading-[1.45]">
          Al aceptar se revelará públicamente quiénes participan en el intercambio.
        </p>
      </div>

      {asOwner
        ? others > 0 && (
            <p className="text-sm leading-[1.45] text-muted-ink">
              {others === 1
                ? `La otra oferta por tu ${listingCode} se cancelará.`
                : `Las otras ${others} ofertas por tu ${listingCode} se cancelarán.`}
            </p>
          )
        : (others > 0 || conflicts.length > 0) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-extrabold">Además se cancelarán</span>
              <ul className="flex list-disc flex-col gap-1 pl-4.5 text-sm leading-[1.45] text-[#4f3f2e]">
                {others > 0 && (
                  <li>
                    {others === 1
                      ? `La otra oferta por esta carta ${listingCode}.`
                      : `Las otras ${others} ofertas por esta carta ${listingCode}.`}
                  </li>
                )}
                {conflicts.map((c, i) => (
                  <li key={i}>
                    Tu oferta por un {c.code}, porque en ella también das {c.cards.length === 1 ? "el" : "los"}{" "}
                    {joinCodes(c.cards)}.
                  </li>
                ))}
              </ul>
            </div>
          )}

      <ErrorLine state={state} />

      <div className="flex flex-col gap-2 lg:flex-row-reverse lg:justify-start">
        <button type="submit" disabled={pending} className={cn(btnDanger, "h-14 text-[17px] lg:h-[52px] lg:text-base")}>
          {pending ? "Aceptando…" : "Aceptar intercambio"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Volver sin aceptar
        </button>
      </div>
    </form>
  );
}

function RejectDialog({
  slug,
  listingId,
  listingCode,
  negotiation: n,
  onClose,
}: Props & { onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState>(
    () => rejectOfferAction(slug, listingId, n.id),
    {},
  );
  const asOwner = n.myRole === "owner";
  return (
    <form action={action} className="flex flex-col gap-3.5 px-5 pt-5.5 pb-4 lg:px-7 lg:pt-6.5 lg:pb-5.5">
      <h2 id={`reject-${n.id}`} className="font-display text-[22px] leading-tight lg:text-2xl">
        {asOwner ? `Rechazar la oferta ${n.alias}` : "Rechazar la contraoferta"}
      </h2>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-ink">
        <span>{asOwner ? "Te daban" : "Te pedían"}</span>
        <MiniCards codes={n.cards} />
        <span>{asOwner ? `por tu ${listingCode}` : `por el ${listingCode}`}</span>
      </div>
      <p className="text-[15px] leading-normal">
        La negociación se cerrará y desaparecerá de la mesa. No queda nada en el registro.
      </p>
      <ErrorLine state={state} />
      <div className="flex flex-col gap-1.5 pt-1 lg:flex-row-reverse">
        <button type="submit" disabled={pending} className={btnDanger}>
          {pending ? "Rechazando…" : asOwner ? "Rechazar oferta" : "Rechazar contraoferta"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Volver
        </button>
      </div>
    </form>
  );
}

function LeaveDialog({
  slug,
  listingId,
  listingCode,
  negotiation: n,
  onClose,
}: Props & { onClose: () => void }) {
  const [state, action, pending] = useActionState<ActionState>(
    () => withdrawNegotiationAction(slug, listingId, n.id),
    {},
  );
  const asOwner = n.myRole === "owner";
  return (
    <form action={action} className="flex flex-col gap-3.5 px-5 pt-5.5 pb-4 lg:px-7 lg:pt-6.5 lg:pb-5.5">
      <h2 id={`leave-${n.id}`} className="font-display text-[22px] leading-tight lg:text-2xl">
        {asOwner ? `Retirarte de la oferta ${n.alias}` : `Retirar tu oferta por el ${listingCode}`}
      </h2>
      <p className="text-[15px] leading-normal">
        {asOwner
          ? `Dejarás de negociar esta oferta por tu ${listingCode}. Tu carta sigue en la mesa.`
          : "Tu oferta desaparecerá de la mesa. Puedes volver a ofertar cuando quieras."}{" "}
        No queda nada en el registro.
      </p>
      <ErrorLine state={state} />
      <div className="flex flex-col gap-1.5 pt-1 lg:flex-row-reverse">
        <button type="submit" disabled={pending} className={btnDanger}>
          {pending ? "Retirando…" : asOwner ? "Retirarme" : "Retirar oferta"}
        </button>
        <button type="button" onClick={onClose} className={btnGhost}>
          Volver
        </button>
      </div>
    </form>
  );
}

