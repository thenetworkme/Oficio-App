import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push/send-server";

/**
 * Sends a single Web Push notification. Protected by CRON_SECRET so it
 * can't be used as an open relay; intended to be called server-to-server
 * (e.g. by a future cron dispatch job) rather than from the browser.
 *
 * Body: { endpoint, p256dh, auth, title, body, url? }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload?.endpoint || !payload?.p256dh || !payload?.auth || !payload?.title) {
    return NextResponse.json({ error: "Payload incompleto" }, { status: 400 });
  }

  try {
    await sendPushNotification(
      { endpoint: payload.endpoint, p256dh: payload.p256dh, auth: payload.auth },
      { title: payload.title, body: payload.body ?? "", url: payload.url },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
