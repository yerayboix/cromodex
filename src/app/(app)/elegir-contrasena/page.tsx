import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFrame } from "@/components/auth-frame";
import { getCurrentUser } from "@/lib/auth";

import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Tu contraseña" };

/**
 * Two uses: where an invitation lands (?bienvenida=1, via /auth/confirm:
 * name and password) and "Cambiar contraseña" from Tu cuenta (password only).
 */
export default function SetPasswordPage({ searchParams }: PageProps<"/elegir-contrasena">) {
  return (
    <Suspense fallback={<AuthFrame title="Tu contraseña">{null}</AuthFrame>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: {
  searchParams: PageProps<"/elegir-contrasena">["searchParams"];
}) {
  const [{ bienvenida }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const welcome = bienvenida === "1";
  return (
    <AuthFrame title={welcome ? "Elige tu contraseña" : "Cambiar contraseña"}>
      <p className="mb-5 text-[15px] leading-normal text-muted-ink">
        {welcome
          ? "Con ella entrarás a partir de ahora, junto con tu email."
          : "La usarás a partir de la próxima vez que entres."}
      </p>
      <SetPasswordForm displayName={user.displayName} welcome={welcome} />
    </AuthFrame>
  );
}
