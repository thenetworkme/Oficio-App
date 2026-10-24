"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <AuthShell
      title="Recupera tu acceso"
      tagline="Te enviamos un enlace para crear una contraseña nueva."
      footer={
        <Link href="/login" className="font-bold underline underline-offset-2">
          Volver a entrar
        </Link>
      }
    >
      {(status === "form" || status === "sending" || status === "error") && (
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-bold text-card-solid-muted">Correo</span>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
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

          <Button
            type="submit"
            variant="dark"
            size="md"
            disabled={status === "sending"}
            className="w-full font-sans text-[15px] font-semibold normal-case tracking-normal"
          >
            {status === "sending" ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}

      {status === "sent" && (
        <div className="flex flex-col items-center py-1 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: "var(--flat-dark)", color: "var(--flat-dark-ink)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <div className="mt-4 text-[20px] font-bold text-card-solid-ink">Revisa tu correo</div>
          <p className="m-0 mt-2 text-[14px] text-card-solid-muted">
            Enviamos el enlace a <b className="text-card-solid-ink">{email}</b>. Puede tardar un minuto.
          </p>
          <Button
            type="button"
            variant="light"
            size="md"
            onClick={handleResend}
            className="mt-5 font-sans text-[15px] font-semibold normal-case tracking-normal"
          >
            Reenviar correo
          </Button>
        </div>
      )}
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
