"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_COLLECTION } from "@/lib/collections";
import { paths } from "@/lib/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SetPasswordState = { error?: string; displayName?: string };

const MIN_PASSWORD = 8;
const MAX_NAME = 30;

/**
 * Sets the signed-in user's password; on the welcome form (after an
 * invitation) also their display name.
 */
export async function setPassword(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const user = await getCurrentUser();
  // The name field only exists on the welcome form.
  const withName = formData.has("displayName");
  const name = String(formData.get("displayName") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  // Errors return the typed name: React resets the form after an action.
  const fail = (error: string): SetPasswordState => ({ error, displayName: name });
  if (withName && !name) return fail("Escribe tu nombre.");
  if (withName && name.length > MAX_NAME) return fail(`El nombre tiene como mucho ${MAX_NAME} caracteres.`);
  if (password.length < MIN_PASSWORD) {
    return fail(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (password !== repeat) return fail("Las dos contraseñas no coinciden.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Same password as before is the only case worth explaining.
    return fail(
      /different/i.test(error.message)
        ? "La contraseña nueva tiene que ser distinta de la anterior."
        : "No se ha podido guardar la contraseña. Inténtalo de nuevo.",
    );
  }

  if (withName) {
    await getDb().update(profiles).set({ displayName: name }).where(eq(profiles.id, user.id));
  }
  redirect(paths.board(DEFAULT_COLLECTION));
}
