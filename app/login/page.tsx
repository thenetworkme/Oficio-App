"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // Presentational only — mirrors PuntoLogin.dc.html's "Mantener la sesión
  // iniciada" toggle, which is likewise local UI state with no backend
  // effect in the reference mockup. Wiring real Firebase Auth session
  // persistence to it would be an auth *behavior* change, out of scope for
  // this visual-only rebuild.
  const [remember, setRemember] = useState(true);
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
    <AuthShell eyebrow="Acceso" title={<>Bienvenido<br />de nuevo</>}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <label className="block">
          <span className="label-xs mb-2 block">Correo</span>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          {emailErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {emailErr}
            </span>
          )}
        </label>

        <label className="block">
          <span className="label-xs mb-2 flex items-center justify-between gap-3">
            <span>Contraseña</span>
            <span className="flex items-center gap-3 normal-case tracking-normal">
              <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink">
                {show ? "Ocultar" : "Mostrar"}
              </button>
              <Link href="/recuperar" className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink">
                ¿Olvidaste tu contraseña?
              </Link>
            </span>
          </span>
          <Input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {passErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {passErr}
            </span>
          )}
        </label>

        <div className="flex items-center gap-3.5">
          <Switch checked={remember} onCheckedChange={setRemember} label="Mantener la sesión iniciada" />
          <span className="text-muted">Mantener la sesión iniciada</span>
        </div>

        {error && (
          <p role="alert" className="m-0 text-[14px] font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
        <Button type="button" variant="outline" onClick={handleGoogle} disabled={submitting} className="w-full">
          {submitting ? "Conectando…" : "Continuar con Google"}
        </Button>
      </form>

      <p className="m-0 mt-9 text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="text-ink underline decoration-border underline-offset-2 hover:decoration-ink">
          Crear cuenta
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
