"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/subscribe";

export function ServiceWorkerRegister() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  return null;
}
