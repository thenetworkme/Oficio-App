import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Faltan las variables VAPID (WEB_PUSH_VAPID_PRIVATE_KEY / _SUBJECT / NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(
  target: PushTarget,
  payload: { title: string; body: string; url?: string },
) {
  ensureConfigured();
  await webpush.sendNotification(
    { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
    JSON.stringify(payload),
  );
}
