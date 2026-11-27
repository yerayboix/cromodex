import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Links from Supabase emails that end in choosing a password. */
const ACCEPTED: readonly EmailOtpType[] = ["invite", "recovery"];

/**
 * Target of the themed invitation email (supabase/templates/invite.html),
 * used only with custom SMTP: verifies the one-time token, which signs the
 * user in, and sends them to choose their password. Bad or expired links go
 * back to the login.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ACCEPTED.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      // New members also pick the name shown in the trade log.
      return redirectTo(type === "invite" ? "/elegir-contrasena?bienvenida=1" : "/elegir-contrasena");
    }
  }
  return redirectTo("/login?enlace=caducado");
}

/**
 * Relative redirect: behind the reverse proxy the server only knows its
 * internal address (0.0.0.0:3000), so an absolute URL would point there.
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
