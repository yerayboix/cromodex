"use client";

import { cn } from "cn";
import { useActionState } from "react";

import { btnPrimary, field } from "@/components/ui-classes";

import { setPassword, type SetPasswordState } from "./actions";

const MIN_PASSWORD = 8;

export function SetPasswordForm({
  displayName,
  welcome,
}: {
  displayName: string;
  /** After an invitation: also choose the display name. */
  welcome: boolean;
}) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(
    setPassword,
    {},
  );
  return (
    <form action={action} className="flex flex-col gap-3.5 lg:gap-4.5">
      {welcome && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display-name" className="text-[15px] font-bold">
            Tu nombre
          </label>
          <input
            id="display-name"
            name="displayName"
            defaultValue={state.displayName ?? displayName}
            autoComplete="nickname"
            maxLength={30}
            required
            aria-describedby="display-name-help"
            className={cn(field, "lg:h-[52px]")}
          />
          <p id="display-name-help" className="text-[13px] leading-normal text-muted-ink">
            Solo aparece en el registro cuando cierras un trato.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[15px] font-bold">
          Contraseña nueva
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          aria-describedby="password-help"
          className={cn(field, "lg:h-[52px]")}
        />
        <p id="password-help" className="text-[13px] text-muted-ink">
          Al menos {MIN_PASSWORD} caracteres.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="repeat" className="text-[15px] font-bold">
          Repite la contraseña
        </label>
        <input
          id="repeat"
          name="repeat"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          className={cn(field, "lg:h-[52px]")}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn(btnPrimary, "h-[54px] text-[17px]")}>
        {pending ? "Guardando…" : welcome ? "Guardar y entrar" : "Guardar contraseña"}
      </button>
    </form>
  );
}
