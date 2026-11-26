"use client";

import { cn } from "cn";
import { useEffect, useState } from "react";

import { field } from "@/components/ui-classes";
import { cardCodeError, normalizeCardCode } from "@/lib/collections";

/*
 * Typing card codes. On desktop the physical keyboard is used; on phones
 * a keypad with digits and "F" avoids the full keyboard covering the cards.
 */

/** True below the desktop breakpoint, where the on-screen keypad shows. */
export function useKeypad() {
  const [keypad, setKeypad] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023.98px)");
    const update = () => setKeypad(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return keypad;
}

/** A typed code with its validation, shared by every code input. */
export function useCodeInput(slug: string) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return {
    value,
    error,
    set(next: string) {
      setValue(next.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 4));
      setError(null);
    },
    /** Validates; returns the normalized code, or null and shows why. */
    take(): string | null {
      const problem = cardCodeError(slug, value);
      if (problem) {
        setError(problem);
        return null;
      }
      setValue("");
      return normalizeCardCode(value);
    },
    clear() {
      setValue("");
      setError(null);
    },
  };
}

type CodeInput = ReturnType<typeof useCodeInput>;

/** Code text field with an "Añadir" button. */
export function CodeField({
  id,
  label,
  input,
  onAdd,
  keypad,
  placeholder = "Código, por ejemplo 15 o F3",
  help,
  name,
}: {
  id: string;
  label: string;
  input: CodeInput;
  onAdd: () => void;
  keypad: boolean;
  placeholder?: string;
  help?: string;
  /** Submit the typed value directly with the form under this name. */
  name?: string;
}) {
  const msgId = `${id}-msg`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          value={input.value}
          onChange={(e) => input.set(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          inputMode={keypad ? "none" : "text"}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={input.error ? true : undefined}
          aria-describedby={input.error || help ? msgId : undefined}
          className={cn(
            field,
            "h-[52px]",
            input.value ? "font-display text-[22px]" : "text-base",
          )}
        />
        <button
          type="button"
          onClick={onAdd}
          className="hidden h-[52px] rounded-[10px] bg-ink px-4.5 text-[15px] font-extrabold text-parchment lg:block"
        >
          Añadir
        </button>
      </div>
      {input.error ? (
        <p id={msgId} role="alert" className="text-sm leading-snug text-danger">
          {input.error}
        </p>
      ) : help ? (
        <p id={msgId} className="text-[13px] text-muted-ink">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** On-screen keypad for phones (hidden on desktop). */
export function Keypad({
  input,
  onAdd,
  withAdd = true,
}: {
  input: CodeInput;
  onAdd?: () => void;
  /** Show the "Añadir" key (lists of cards); a single code needs none. */
  withAdd?: boolean;
}) {
  const press = (key: string) => {
    if (key === "F") {
      if (!input.value.startsWith("F")) input.set(`F${input.value}`);
      return;
    }
    input.set(input.value + key);
  };
  const digit =
    "flex items-center justify-center rounded-[9px] border border-[#dccba6] bg-panel font-display text-xl text-ink active:bg-panel-2";
  const special =
    "flex items-center justify-center rounded-[9px] border-2 border-transparent font-display text-xl text-ink [background:linear-gradient(var(--theme-panel),var(--theme-panel))_padding-box,var(--theme-frame-special)_border-box]";
  const erase =
    "flex items-center justify-center rounded-[9px] border-[1.5px] border-field font-body text-sm font-bold text-ink";

  if (!withAdd) {
    return (
      <div role="group" aria-label="Teclado de códigos" className="grid auto-rows-[42px] grid-cols-6 gap-1.5 lg:hidden">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={digit}>
            {d}
          </button>
        ))}
        <button type="button" aria-label="Especial F" onClick={() => press("F")} className={special}>
          F
        </button>
        <button
          type="button"
          aria-label="Borrar último carácter"
          onClick={() => input.set(input.value.slice(0, -1))}
          className={erase}
        >
          Borrar
        </button>
      </div>
    );
  }

  return (
    <div role="group" aria-label="Teclado de códigos" className="grid auto-rows-[46px] grid-cols-4 gap-[7px] lg:hidden">
      {["1", "2", "3"].map((d) => (
        <button key={d} type="button" onClick={() => press(d)} className={digit}>
          {d}
        </button>
      ))}
      <button
        type="button"
        aria-label="Borrar último carácter"
        onClick={() => input.set(input.value.slice(0, -1))}
        className={erase}
      >
        Borrar
      </button>
      {["4", "5", "6"].map((d) => (
        <button key={d} type="button" onClick={() => press(d)} className={digit}>
          {d}
        </button>
      ))}
      <button
        type="button"
        aria-label="Añadir la carta"
        onClick={onAdd}
        className="row-span-2 flex items-center justify-center rounded-[9px] bg-ink font-body text-[15px] font-extrabold text-parchment"
      >
        Añadir
      </button>
      {["7", "8", "9"].map((d) => (
        <button key={d} type="button" onClick={() => press(d)} className={digit}>
          {d}
        </button>
      ))}
      <button type="button" aria-label="Especial F" onClick={() => press("F")} className={special}>
        F
      </button>
      <button type="button" onClick={() => press("0")} className={digit}>
        0
      </button>
    </div>
  );
}
