"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";

// Fixed semantic strength colors, matching
// design-reference/pomodoro/html/PomoSignup.dc.html's own literal palette
// (`cols` in its inline script) — not theme tokens, same category as
// --go-bg/--flat-dark: a small weak/ok/strong signal that should read the
// same regardless of light/dark mode.
const STRENGTH_COLORS = ["#e5e5e5", "#d9534f", "#e8a33d", "#6aa84f", "#2e8b57"];
const STRENGTH_LABELS = ["Escribe una contraseña", "Débil", "Media", "Fuerte", "Muy fuerte"];

function passwordStrength(p: string): number {
  if (p.length === 0) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.max(1, s);
}

export default function RegistroPage() {
  const router = useRouter();
  const { user, loading, signUpWithEmail, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(true);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/onboarding");
  }, [loading, user, router]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const strength = passwordStrength(password);
  const nameErr = tried && name.trim().length < 2 ? "Dinos tu nombre." : "";
  const emailErr = tried && !emailOk ? "Ese correo no parece correcto." : "";
  const passErr = tried && password.length < 8 ? "La contraseña necesita 8 caracteres o más." : "";
  const termsErr = tried && !terms ? "Tienes que aceptar para continuar." : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (name.trim().length < 2 || !emailOk || password.length < 8 || !terms) return;
    setSubmitting(true);
    try {
      await signUpWithEmail(email, password, name.trim());
      router.replace("/onboarding");
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
      router.replace("/onboarding");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      tagline="Empieza a contar tus horas hoy mismo."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold underline underline-offset-2">
            Entrar
          </Link>
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full gap-2.5 border-2 border-card-solid-line bg-transparent font-sans text-[15px] font-semibold normal-case tracking-normal text-card-solid-ink hover:bg-surface-muted"
      >
        <GoogleMark />
        {submitting ? "Conectando…" : "Registrarme con Google"}
      </Button>

      <div className="my-5 flex items-center gap-3 text-[13px] text-card-solid-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-card-solid-line" />
        o con tu correo
        <span className="h-px flex-1 bg-card-solid-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-bold text-card-solid-muted">Nombre</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Cómo te llamas?" />
          {nameErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {nameErr}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[14px] font-bold text-card-solid-muted">Correo</span>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          {emailErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {emailErr}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[14px] font-bold text-card-solid-muted">Contraseña</span>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pr-[68px]"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              className="absolute right-1.5 top-1.5 h-8 rounded-button bg-transparent px-2 text-[13px] font-bold text-card-solid-muted transition-colors hover:text-card-solid-ink"
            >
              {show ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1.5" role="img" aria-label={`Fortaleza ${STRENGTH_LABELS[strength]}`}>
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                aria-hidden="true"
                className="h-[5px] flex-1 rounded-chip transition-colors"
                style={{ background: n <= strength ? STRENGTH_COLORS[strength] : "var(--card-solid-line)" }}
              />
            ))}
          </div>
          <div className="mt-1.5 text-[13px] text-card-solid-muted">
            Seguridad: <b className="text-card-solid-ink">{STRENGTH_LABELS[strength]}</b>
          </div>
          {passErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {passErr}
            </span>
          )}
        </label>

        <button
          type="button"
          role="checkbox"
          aria-checked={terms}
          onClick={() => setTerms((t) => !t)}
          className="flex items-start gap-2.5 border-0 bg-transparent p-0 text-left text-[14px] text-card-solid-muted"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border-2 text-white transition-colors"
            style={{
              background: terms ? "var(--flat-dark)" : "transparent",
              borderColor: terms ? "var(--flat-dark)" : "var(--card-solid-line)",
            }}
          >
            {terms && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            )}
          </span>
          Acepto los términos y la política de privacidad.
        </button>
        {termsErr && (
          <span role="alert" className="-mt-2 block text-[13px] font-medium text-danger">
            {termsErr}
          </span>
        )}

        {error && (
          <p role="alert" className="m-0 text-[14px] font-medium text-danger">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="dark"
          size="md"
          disabled={submitting}
          className="mt-1 w-full font-sans text-[15px] font-semibold normal-case tracking-normal"
        >
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthShell>
  );
}

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
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
