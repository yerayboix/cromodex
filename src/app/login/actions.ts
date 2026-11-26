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
