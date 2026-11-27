"use client";

import { X } from "lucide-react";
import { useActionState, useTransition } from "react";

import { HandCard } from "@/components/cards";
import { CodeField, Keypad, useCodeInput, useKeypad } from "@/components/code-entry";
import { cardCodeError } from "@/lib/collections";

import type { ActionState } from "../actions";

/** Your wanted cards; tapping one removes it. */
export function WantedList({
  items,
  remove,
}: {
  items: { code: string; onTable: boolean }[];
  remove: (code: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <ul className="flex flex-wrap gap-3 lg:gap-3.5" aria-busy={pending}>
      {items.map(({ code, onTable }) => (
        <li key={code} className="relative">
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => remove(code))}
            aria-label={`Quitar el ${code} de tu lista${onTable ? ". Hay al menos una en la mesa" : ""}`}
            className="relative disabled:opacity-60"
          >
            <HandCard code={code} className="shadow-none [&>span]:h-[58px] [&>span]:w-11 [&>span]:justify-center [&>span]:text-[17px] lg:[&>span]:h-[78px] lg:[&>span]:w-[58px] lg:[&>span]:text-xl" />
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-full border-2 border-parchment bg-ink text-parchment"
            >
              <X className="size-3" strokeWidth={3.4} />
            </span>
          </button>
          {onTable && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -bottom-1.5 size-4 rounded-full border-2 border-parchment bg-ok"
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Add a code to your wanted list. */
export function WantedForm({
  slug,
  action,
}: {
  slug: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const input = useCodeInput(slug);
  const keypad = useKeypad();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error) input.clear();
      return result;
    },
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Validate on the client first; the server validates again.
        if (cardCodeError(slug, input.value)) {
          e.preventDefault();
          input.take();
        }
      }}
      className="flex flex-col gap-2"
    >
      <CodeField
        id="wanted-code"
        name="code"
        label="Añadir a tu lista"
        input={input}
        keypad={keypad}
        placeholder="Código, por ejemplo 77 o F3"
        onAdd={() => (document.getElementById("wanted-submit") as HTMLButtonElement | null)?.click()}
      />
      <div className="flex flex-col gap-2 lg:hidden">
        <Keypad input={input} withAdd={false} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        id="wanted-submit"
        type="submit"
        disabled={pending}
        className="h-[46px] rounded-[10px] bg-table px-4 text-[15px] font-extrabold text-parchment disabled:opacity-60 lg:sr-only"
      >
        {pending ? "Añadiendo…" : "Añadir"}
      </button>
    </form>
  );
}
