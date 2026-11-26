"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type DisplayNameState = { error?: string; saved?: boolean };

const MAX_NAME = 30;

export async function updateDisplayName(
  _prev: DisplayNameState,
  formData: FormData,
): Promise<DisplayNameState> {
  const user = await getCurrentUser();
  const name = String(formData.get("displayName") ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { error: "Escribe un nombre." };
  if (name.length > MAX_NAME) {
    return { error: `Como mucho ${MAX_NAME} caracteres.` };
  }
  await getDb()
    .update(profiles)
    .set({ displayName: name })
    .where(eq(profiles.id, user.id));
  refresh();
  return { saved: true };
}
