"use client";

import { cn } from "cn";
import { KeyRound, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { logout, updateDisplayName } from "@/app/(app)/actions";
import { Modal, SheetHandle } from "@/components/modal";
import { NotificationsSection } from "@/components/shell/notifications-section";
import { btnOutline, field } from "@/components/ui-classes";
import { paths } from "@/lib/paths";
import type { NotificationSettings } from "@/server/notifications/settings";

/** The signed-in user's own account: name, notifications, password, sign out. */
export function AccountMenu({
  displayName,
  email,
  notifications,
  variant,
}: {
  displayName: string;
  email: string;
  notifications: NotificationSettings;
  /** "avatar": round initial (phone header); "sidebar": desktop row. */
  variant: "avatar" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      {variant === "avatar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Tu cuenta: ${displayName}`}
          className="flex size-10 items-center justify-center rounded-full border-2 border-parchment text-[15px] font-extrabold"
        >
          {initial}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Tu cuenta: ${displayName}`}
          className="flex w-full items-center gap-3 rounded-xl border border-parchment/15 p-2.5 text-left hover:bg-parchment/5"
        >
          <span
            aria-hidden="true"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full border-2 border-parchment text-[15px] font-extrabold"
          >
            {initial}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-extrabold">{displayName}</span>
            <span className="text-xs text-muted-table">Tu cuenta</span>
          </span>
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="account-title">
        <div className="flex flex-col gap-4.5 px-5 pt-3 pb-7 lg:pt-5">
          <SheetHandle />
          <div className="flex items-center justify-between">
            <h2 id="account-title" className="font-display text-[22px]">
              Tu cuenta
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
          <NameForm displayName={displayName} />
          {notifications.channels.length > 0 && <NotificationsSection settings={notifications} />}
          <div className="flex flex-col gap-1 border-t border-[#dccba6] pt-3.5">
            <span className="text-[13px] text-muted-ink">Has entrado como</span>
            <span className="text-[15px] font-bold break-all">{email}</span>
          </div>
          <Link
            href={paths.setPassword}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 self-start text-[15px] font-bold underline underline-offset-4"
          >
            <KeyRound className="size-[18px]" />
            Cambiar contraseña
          </Link>
          <form action={logout}>
            <button type="submit" className={cn(btnOutline, "w-full")}>
              <LogOut className="size-5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}

function NameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="display-name" className="text-[15px] font-bold">
        Tu nombre
      </label>
      <input
        id="display-name"
        name="displayName"
        defaultValue={displayName}
        autoComplete="nickname"
        maxLength={30}
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby="display-name-help"
        className={field}
      />
      <p id="display-name-help" className="text-[13px] leading-normal text-muted-ink">
        Solo aparece en el registro cuando cierras un trato. En la mesa y en las
        ofertas nunca se muestra.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p role="status" className="text-sm font-semibold text-ok">
          Nombre guardado.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 self-start rounded-[10px] bg-table px-4.5 text-[15px] font-extrabold text-parchment disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar nombre"}
      </button>
    </form>
  );
}
