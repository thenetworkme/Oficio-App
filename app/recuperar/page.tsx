"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";

type Status = "form" | "sending" | "sent" | "error";

export default function RecuperarPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<Status>("form");
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const emailErr = tried && !emailOk ? "Ese correo no parece correcto." : "";

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!emailOk) return;
    setStatus("sending");
    setError(null);
    try {
      await sendPasswordReset(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(mapAuthError(err));
    }
  }

  async function handleResend() {
    setStatus("sending");
    try {
      await sendPasswordReset(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(mapAuthError(err));
    }
  }

  return (
    <AuthShell eyebrow="Recuperar acceso" title="Restablece tu contraseña">
      {(status === "form" || status === "sending" || status === "error") && (
        <form onSubmit={handleSend} className="flex flex-col gap-7">
          <p className="m-0 text-muted">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.</p>

          <label className="block">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="mt-2" />
            {emailErr && (
              <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
                {emailErr}
              </span>
            )}
          </label>

          {status === "error" && error && (
            <p role="alert" className="m-0 text-[14px] font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={status === "sending"} className="w-full">
            {status === "sending" ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}

      {status === "sent" && (
        <div className="flex flex-col gap-6">
          <Card className="flex items-center gap-4.5 p-7">
            <span
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-full bg-signal"
              style={{ boxShadow: "0 0 0 6px color-mix(in srgb, var(--signal) 20%, transparent)" }}
            />
            <div>
              <div className="text-[18px] text-ink">Revisa tu correo</div>
              <div className="mt-0.5 text-[14px] text-muted">
                Enviamos el enlace a <span className="text-ink">{email}</span>. Vence en 30 minutos.
              </div>
            </div>
          </Card>
          <Button type="button" variant="outline" onClick={handleResend} className="w-full">
            Reenviar correo
          </Button>
        </div>
      )}

      <p className="m-0 mt-9">
        <Link href="/login" className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/user-not-found":
      return "No encontramos una cuenta con ese correo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    case "auth/invalid-email":
      return "Ese correo no parece correcto.";
    default:
      return "No pudimos enviar el correo. Intenta de nuevo.";
  }
}
