import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Links from Supabase emails that end in choosing a password. */
const ACCEPTED: readonly EmailOtpType[] = ["invite", "recovery"];

/**
 * Target of the invitation email (see supabase/templates/invite.html):
 * verifies the one-time token, which signs the user in, and sends them to
 * choose their password. Any bad or expired link goes back to the login.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  const target = request.nextUrl.clone();
  target.search = "";

  if (tokenHash && type && ACCEPTED.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      target.pathname = "/elegir-contrasena";
      // New members also pick the name shown in the trade log.
      if (type === "invite") target.searchParams.set("bienvenida", "1");
      return NextResponse.redirect(target);
    }
  }

  target.pathname = "/login";
  target.searchParams.set("enlace", "caducado");
  return NextResponse.redirect(target);
}
