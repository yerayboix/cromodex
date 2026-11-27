import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFrame } from "@/components/auth-frame";

import { ExpiredLinkNotice } from "./expired-link-notice";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthFrame title="Entrar">
      <Suspense fallback={null}>
        <ExpiredLinkNotice />
      </Suspense>
      <LoginForm />
    </AuthFrame>
  );
}
