"use client";

import { saveSubscription } from "@/lib/firestore/pushSubscriptions";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))) as Uint8Array<ArrayBuffer>;
}

/** Registers the service worker (idempotent) and returns its registration. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** Subscribes the current browser to Web Push and stores it in Firestore. */
export async function savePushSubscription(userId: string): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Falta NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY");
  }
  const registration = await registerServiceWorker();
  if (!registration) throw new Error("Service worker no disponible en este navegador");

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!key || !auth) throw new Error("No se pudo leer la suscripción push");

  await saveSubscription(userId, {
    endpoint: subscription.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
    auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
  });
}
