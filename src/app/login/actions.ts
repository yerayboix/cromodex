"use server";

import { redirect } from "next/navigation";

import { DEFAULT_COLLECTION } from "@/lib/collections";
import { paths } from "@/lib/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce tu email y tu contraseña.", email };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Same message for every failure: do not reveal which accounts exist.
    return { error: "Email o contraseña incorrectos.", email };
  }

  redirect(paths.board(DEFAULT_COLLECTION));
}

export type EmailLinkState = { error?: string };

/**
 * Finishes an invitation or recovery link sent with Supabase's default
 * email templates: Supabase verifies the link and redirects here with the
 * session in the URL fragment, which only the browser can read. The client
 * hands the tokens over once; the session is stored in cookies server-side,
 * like a normal login, and the browser never keeps them.
 */
export async function acceptEmailLink(
  accessToken: string,
  refreshToken: string,
  type: string,
): Promise<EmailLinkState> {
  if (!accessToken || !refreshToken) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return { error: "invalid" };
  redirect(type === "invite" ? "/elegir-contrasena?bienvenida=1" : "/elegir-contrasena");
}
