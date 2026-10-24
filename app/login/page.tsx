"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <AuthShell
      title="Entra a tu oficio"
      tagline="10.000 horas, una sesión a la vez."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-bold underline underline-offset-2">
            Créala gratis
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
        {submitting ? "Conectando…" : "Continuar con Google"}
      </Button>

      <div className="my-5 flex items-center gap-3 text-[13px] text-card-solid-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-card-solid-line" />
        o con tu correo
        <span className="h-px flex-1 bg-card-solid-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
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
          {passErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {passErr}
            </span>
          )}
        </label>

        <div className="-mt-1 flex justify-end">
          <Link href="/recuperar" className="text-[13.5px] text-card-solid-muted underline underline-offset-2 hover:text-card-solid-ink">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

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
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
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
