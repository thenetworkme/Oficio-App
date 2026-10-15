import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { SoundProvider } from "@/lib/sound/SoundProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficio",
  description: "Registra tus horas de práctica hasta las 10.000 horas de maestría.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <AuthProvider>
          <ThemeProvider>
            <SoundProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </SoundProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
