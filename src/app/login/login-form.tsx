"use client";

import { cn } from "cn";
import { useActionState } from "react";

import { btnPrimary, field } from "@/components/ui-classes";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3.5 lg:gap-4.5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[15px] font-bold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={cn(field, "lg:h-[52px]")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[15px] font-bold">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-[13px] leading-[1.45] text-muted-ink lg:text-left lg:text-sm">
        Las cuentas las crea quien administra el grupo.
      </p>
    </form>
  );
}
