"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
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
    <AuthShell asideColor="var(--a3)" bubble="¡Yo te ayudo!" headline="A todos se nos olvida alguna vez.">
      <div>
        <h1 className="m-0 text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">Recupera tu contraseña.</h1>
        <p className="mb-0 mt-2.5 text-[18px] font-medium">Te mandamos un enlace a tu correo.</p>
      </div>

      {(status === "form" || status === "sending" || status === "error") && (
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              style={emailErr || status === "error" ? { borderColor: "var(--danger)" } : undefined}
            />
            {emailErr && (
              <span role="alert" className="text-[14px] font-bold text-danger">
                {emailErr}
              </span>
            )}
          </div>

          {status === "error" && error && (
            <p role="alert" className="m-0 text-[14px] font-bold text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="bx press min-h-14 w-full text-[18px] font-bold text-ink-solid disabled:opacity-60"
            style={{ background: "var(--a1)" }}
          >
            {status === "sending" ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}

      {status === "sent" && (
        <div className="flex flex-col gap-4">
          <div className="bx flex flex-col gap-2 p-5 text-ink-solid" style={{ background: "var(--a3)" }}>
            <span className="text-[20px] font-bold">Revisa tu correo</span>
            <p className="m-0 font-medium">
              Te mandamos un enlace a <b>{email}</b> para que elijas una contraseña nueva.
            </p>
          </div>
          <button type="button" onClick={handleResend} className="bx press min-h-13 bg-card font-bold">
            Reenviar correo
          </button>
        </div>
      )}

      <p className="m-0 text-center font-medium">
        <Link href="/login" className="font-bold underline">
          Volver a iniciar sesión
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
