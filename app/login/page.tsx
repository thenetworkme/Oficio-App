"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell, GoogleSwatch } from "@/components/auth/AuthShell";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const emailErr = tried && !emailOk ? "Ese correo no parece correcto." : "";
  const passErr = tried && password.length === 0 ? "Escribe tu contraseña." : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (!emailOk || password.length === 0) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell asideColor="var(--a1)" bubble="¡Te estaba esperando!" headline="10.000 horas no se hacen solas.">
      <div>
        <h1 className="m-0 text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">Qué bueno verte de nuevo.</h1>
        <p className="mb-0 mt-2.5 text-[18px] font-medium">Tu racha te espera.</p>
      </div>

      <button type="button" onClick={handleGoogle} disabled={submitting} className="bx press flex min-h-14 w-full items-center justify-center gap-3 bg-card text-[18px] font-bold disabled:opacity-60">
        <GoogleSwatch />
        {submitting ? "Conectando con Google…" : "Continuar con Google"}
      </button>

      <div className="flex items-center gap-3.5" aria-hidden="true">
        <span className="h-0 flex-1 border-t-[3px] border-dashed border-ink" />
        <span className="label-xs">o con correo</span>
        <span className="h-0 flex-1 border-t-[3px] border-dashed border-ink" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" style={emailErr ? { borderColor: "var(--danger)" } : undefined} />
          {emailErr && <span role="alert" className="text-[14px] font-bold text-danger">{emailErr}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/recuperar" className="text-[14px] font-bold underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="flex gap-2.5">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              style={passErr ? { borderColor: "var(--danger)" } : undefined}
              className="flex-1"
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="bx press min-w-[96px] font-bold">
              {show ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {passErr && <span role="alert" className="text-[14px] font-bold text-danger">{passErr}</span>}
        </div>

        {error && (
          <p role="alert" className="m-0 text-[14px] font-bold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bx press min-h-14 w-full text-[18px] font-bold text-ink-solid disabled:opacity-60"
          style={{ background: "var(--a1)" }}
        >
          {submitting ? "¡Entrando…!" : "Entrar"}
        </button>
      </form>

      <p className="m-0 text-center font-medium">
        ¿Primera vez?{" "}
        <Link href="/registro" className="font-bold underline">
          Crea tu cuenta
        </Link>
      </p>
    </AuthShell>
  );
}

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de Google antes de terminar.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    default:
      return "Algo salió mal. Intenta de nuevo.";
  }
}
