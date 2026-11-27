import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { dispatchNotifications } from "@/server/notifications/dispatch";

/**
 * Called every few minutes by a scheduled job (Dokploy) to retry failed
 * deliveries and send batched notices. Actions already dispatch right away;
 * this is the safety net. Auth: Authorization: Bearer NOTIFICATIONS_CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET ?? "";
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !sameSecret(given, secret)) {
    return new NextResponse(null, { status: 401 });
  }
  return NextResponse.json(await dispatchNotifications());
}

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
