import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/login";
/**
 * Reachable without a session: the login, the email-link handler and the
 * webhooks, which authenticate themselves with a secret.
 */
const PUBLIC_PATHS = new Set([LOGIN_PATH, "/auth/confirm", "/api/telegram/webhook"]);

/**
 * Refreshes the Supabase session on every request and gates the app:
 * signed-out users only reach /login; signed-in users skip it.
 * This is a first barrier only: every Server Action and data read checks
 * the session again (see src/lib/auth.ts).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims():
  // getClaims() validates the JWT and refreshes the session if needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;
  const onLogin = pathname === LOGIN_PATH;

  if (!signedIn && !PUBLIC_PATHS.has(pathname)) return redirectKeepingCookies(request, response, LOGIN_PATH);
  if (signedIn && onLogin) return redirectKeepingCookies(request, response, "/");

  return response;
}

/** Redirect while preserving any refreshed auth cookies and cache headers. */
function redirectKeepingCookies(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
) {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
