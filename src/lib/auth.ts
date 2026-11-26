import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  /** Never send this to the client; it is for server-side queries only. */
  id: string;
  displayName: string;
  /** The signed-in user's own email (only ever shown to themselves). */
  email: string;
};

/**
 * Data Access Layer entry point: the signed-in user, or a redirect to
 * /login. Deduplicated per request. Reads cookies, so callers must render
 * behind a <Suspense> boundary (Cache Components).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";
  if (!userId) redirect("/login");

  const [profile] = await getDb()
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  // The auth.users trigger always creates the profile; if it is missing,
  // fail loudly instead of redirecting (the proxy would bounce back).
  if (!profile) throw new Error("Signed-in user has no profile");

  return { id: userId, displayName: profile.displayName, email };
});
