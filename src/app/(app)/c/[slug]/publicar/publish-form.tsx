"use client";

import { cn } from "cn";
import { Minus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { BigCard } from "@/components/cards";
import { Keypad, useCodeInput, useKeypad } from "@/components/code-entry";
import { btnGhost, btnGold, field } from "@/components/ui-classes";
import { cardCodeError, isSpecialCode, normalizeCardCode } from "@/lib/collections";
import { paths } from "@/lib/paths";

import { publishAction } from "../actions";

const MAX_COPIES = 10;

export function PublishForm({ slug }: { slug: string }) {
  const input = useCodeInput(slug);
  const keypad = useKeypad();
  const [copies, setCopies] = useState(1);
  const [state, action, pending] = useActionState(publishAction.bind(null, slug), {});

  const code = normalizeCardCode(input.value);
  const valid = input.value !== "" && cardCodeError(slug, input.value) === null;
  const problem = input.value && !valid ? cardCodeError(slug, input.value) : null;
  const publishLabel = copies === 1 ? "Publicar carta" : `Publicar ${copies} cartas`;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Preview */}
      <section
        aria-label="Vista previa"
        className="flex items-center gap-4.5 px-6 pt-2 pb-4.5 lg:w-[300px] lg:shrink-0 lg:flex-col lg:justify-center lg:gap-6.5 lg:bg-chart-fine lg:px-7 lg:py-8"
      >
        <div className="relative h-[152px] w-[104px] shrink-0 lg:h-[200px] lg:w-[140px]">
          {copies > 1 && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute top-1 left-2.5 w-full rotate-6 rounded-xl p-[3px] opacity-70",
                valid && isSpecialCode(code) ? "frame-special" : "frame-regular",
              )}
            >
              <div className="h-[140px] rounded-[9px] bg-panel-2 lg:h-[188px]" />
            </div>
          )}
          <div className="absolute top-0 left-0">
            {valid ? (
              <>
                <BigCard code={code} className="w-[104px] [--h:140px] lg:hidden" size="sm" />
                <BigCard code={code} className="hidden w-[134px] [--h:188px] lg:block" />
              </>
            ) : (
              <div className="flex h-[146px] w-[104px] items-center justify-center rounded-xl border-[2.5px] border-dashed border-outline text-sm text-muted-table lg:h-[194px] lg:w-[134px]">
                ?
              </div>
            )}
          </div>
        </div>
        <p className="text-sm leading-normal text-muted-table lg:text-center">
          {copies === 1
            ? "Así saldrá en la mesa, sin tu nombre. Recibirá sus propias ofertas."
            : `Así saldrán en la mesa: ${copies} cartas separadas, sin tu nombre. Cada una recibe sus propias ofertas.`}
        </p>
      </section>

      {/* Form */}
      <form
        action={action}
        className="flex flex-1 flex-col gap-3 rounded-t-[22px] bg-parchment px-5 pt-4.5 pb-5 text-ink lg:gap-4.5 lg:rounded-none lg:px-7 lg:pt-5.5 lg:pb-6.5"
      >
        <div className="hidden items-center justify-between lg:flex">
          <h2 id="publish-title" className="font-display text-[26px]">
            Publicar carta
          </h2>
          <Link
            href={paths.board(slug)}
            aria-label="Cerrar sin publicar"
            className="-mr-2 flex size-10 items-center justify-center"
          >
            <X className="size-[22px]" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="publish-code" className="text-[15px] font-bold">
            Código de la carta
          </label>
          <input
            id="publish-code"
            name="code"
            value={input.value}
            onChange={(e) => input.set(e.target.value)}
            inputMode={keypad ? "none" : "text"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            placeholder="Por ejemplo 45 o F7"
            aria-invalid={problem ? true : undefined}
            aria-describedby="publish-code-help"
            className={cn(
              field,
              "h-[52px]",
              input.value ? "font-display text-2xl" : "text-base",
              valid && "border-2 border-ok",
            )}
          />
          <p
            id="publish-code-help"
            className={cn(
              "text-[13px]",
              problem ? "text-danger" : valid ? "font-semibold text-ok" : "text-muted-ink",
            )}
          >
            {problem ??
              (valid
                ? `${isSpecialCode(code) ? "Especial" : "Carta"} ${code}. Existe en esta colección.`
                : "Escribe el código que aparece en el cromo.")}
          </p>
        </div>

        <Keypad input={input} withAdd={false} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span id="copies-label" className="text-[15px] font-bold">
              Copias
            </span>
            <span className="text-[13px] text-muted-ink">Una carta por copia</span>
          </div>
          <div role="group" aria-labelledby="copies-label" className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Una copia menos"
              disabled={copies <= 1}
              onClick={() => setCopies((c) => Math.max(1, c - 1))}
              className="flex size-11 items-center justify-center rounded-[10px] border-[1.5px] border-field bg-panel disabled:opacity-40"
            >
              <Minus className="size-[18px]" strokeWidth={2.6} />
            </button>
            <output aria-live="polite" className="w-11 text-center font-display text-[22px]">
              {copies}
            </output>
            <button
              type="button"
              aria-label="Una copia más"
              disabled={copies >= MAX_COPIES}
              onClick={() => setCopies((c) => Math.min(MAX_COPIES, c + 1))}
              className="flex size-11 items-center justify-center rounded-[10px] border-[1.5px] border-field bg-panel disabled:opacity-40"
            >
              <Plus className="size-[18px]" strokeWidth={2.6} />
            </button>
          </div>
          <input type="hidden" name="copies" value={copies} />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="mt-auto flex justify-end gap-2 pt-1">
          <Link href={paths.board(slug)} className={cn(btnGhost, "hidden lg:inline-flex")}>
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!valid || pending}
            className={cn(btnGold, "h-[54px] w-full text-[17px] lg:h-[52px] lg:w-auto lg:text-base")}
          >
            {pending ? "Publicando…" : publishLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
