import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SoundProvider } from "@/lib/sound/SoundProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oficio",
  description: "Registra tus horas de práctica hasta las 10.000 horas de maestría.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF4D6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <AuthProvider>
          <ThemeProvider>
            <SoundProvider>{children}</SoundProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
