"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { useActionState, useState } from "react";

import { BigCard, HandCard } from "@/components/cards";
import { CodeField, Keypad, useCodeInput, useKeypad } from "@/components/code-entry";
import { SwapIcon } from "@/components/icons";
import { btnPrimary } from "@/components/ui-classes";

import type { ActionState } from "@/app/(app)/c/[slug]/actions";
import { ComposerTitle } from "./panel";

const MAX_CARDS = 10;

/**
 * Builds the list of cards the offerer gives: a new offer, or a counter
 * from either side. The listed card never changes.
 */
export function CardComposer({
  slug,
  title,
  intro,
  closeHref,
  listingCode,
  initialCards,
  /** "receive": the viewer gets the listed card (offerer); "give": owner. */
  listingSide,
  submitLabel,
  fieldLabel,
  action,
}: {
  slug: string;
  title: string;
  intro?: string;
  closeHref: string;
  listingCode: string;
  initialCards: string[];
  listingSide: "receive" | "give";
  submitLabel: string;
  fieldLabel: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const input = useCodeInput(slug);
  const keypad = useKeypad();
  // Each card keeps whether it was in the proposal we are answering.
  const [cards, setCards] = useState(() =>
    initialCards.map((code, i) => ({ key: `i${i}`, code, isNew: false })),
  );
  const [state, formAction, pending] = useActionState(action, {});
  const [nextKey, setNextKey] = useState(0);
  const isCounter = initialCards.length > 0;

  const add = () => {
    if (cards.length >= MAX_CARDS) return;
    const code = input.take();
    if (!code) return;
    setCards((cs) => [...cs, { key: `n${nextKey}`, code, isNew: isCounter }]);
    setNextKey((k) => k + 1);
  };
  const remove = (key: string) => setCards((cs) => cs.filter((c) => c.key !== key));

  const hand = (
    <div className="flex flex-wrap items-center justify-center gap-y-3 px-1">
      {cards.length === 0 ? (
        <span className="flex h-[92px] w-[66px] items-center justify-center rounded-lg border-2 border-dashed border-outline text-center text-xs text-muted-table">
          Añade una carta
        </span>
      ) : (
        cards.map((c, i) => (
          <button
            key={c.key}
            type="button"
            onClick={() => remove(c.key)}
            aria-label={`Quitar el ${c.code}${c.isNew ? ", añadida por ti" : ""}`}
            className={cn(
              "relative",
              i > 0 && "-ml-3.5",
              i % 2 === 0 ? "-rotate-6" : "rotate-6",
            )}
            style={{ zIndex: i }}
          >
            <HandCard code={c.code} isNew={c.isNew} size={cards.length > 3 ? "sm" : "md"} />
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-full border-2 border-parchment bg-ink text-parchment"
            >
              <X className="size-3" strokeWidth={3.4} />
            </span>
          </button>
        ))
      )}
    </div>
  );
  const listingCard = <BigCard code={listingCode} size="sm" className="w-[92px] [--h:124px]" />;
  const handLabel =
    listingSide === "give"
      ? "Pides (pulsa una para quitarla)"
      : "Das (pulsa una para quitarla)";

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-1.5 pt-2.5 pb-4 lg:bg-chart-fine lg:px-5.5 lg:pt-3.5 lg:pb-5.5">
        <ComposerTitle href={closeHref}>{title}</ComposerTitle>
        {intro && <p className="px-3.5 text-sm leading-[1.45] text-muted-table lg:px-0">{intro}</p>}
        <section
          aria-label="El intercambio"
          className="grid grid-cols-[auto_auto_1fr] items-center justify-center gap-3 px-3.5 lg:px-0"
        >
          <div className="flex flex-col items-center gap-2">
            {listingCard}
            <span className="text-[13px] text-muted-table">
              {listingSide === "give" ? "Das" : "Recibes"}
            </span>
          </div>
          <SwapIcon className="mb-6 size-7 text-muted-table" />
          <div className="flex min-w-0 flex-col items-center gap-2">
            <div className="flex min-h-[130px] items-center">{hand}</div>
            <span className="text-center text-[13px] text-muted-table">
              {isCounter && listingSide === "give" ? "Pides (en amarillo, lo nuevo)" : handLabel}
            </span>
          </div>
        </section>
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-t-[22px] bg-parchment px-5 pt-4.5 pb-5 text-ink lg:rounded-none lg:px-5.5 lg:pt-5">
        {cards.map((c) => (
          <input key={c.key} type="hidden" name="card" value={c.code} />
        ))}
        <CodeField
          id="composer-code"
          label={fieldLabel}
          input={input}
          onAdd={add}
          keypad={keypad}
          help={
            cards.length >= MAX_CARDS
              ? `Como mucho ${MAX_CARDS} cartas.`
              : "Puedes repetir carta si tienes varias copias."
          }
        />
        <Keypad input={input} onAdd={add} />
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={cards.length === 0 || pending}
          className={cn(btnPrimary, "mt-auto h-[54px] text-[17px]")}
        >
          {pending ? "Enviando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
