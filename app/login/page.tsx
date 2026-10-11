"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11 0 20.5-8 20.5-20.5 0-1.4-.2-2.7-.4-4z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z"
      />
      <path
        fill="#4CAF50"
        d="M24 45.5c5.3 0 10.2-1.8 13.9-5l-6.4-5.4c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 41 16.2 45.5 24 45.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.4 5.4C41.5 36 44.5 30.9 44.5 25c0-1.4-.2-2.7-.9-4.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
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
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-[420px] rounded-card border border-line bg-card p-8 flex flex-col gap-7">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="11" stroke="var(--line)" strokeWidth="3" />
            <path d="M14 3a11 11 0 0 1 9.5 5.5" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight">Oficio</span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-tight">
            {mode === "login" ? "Bienvenido de nuevo." : "Empieza tu camino."}
          </h1>
          <p className="m-0 text-[14px] text-muted">
            {mode === "login"
              ? "Inicia sesión para seguir registrando tus horas."
              : "Crea tu cuenta para empezar a medir tu práctica."}
          </p>
        </div>

        <Button type="button" variant="outline" onClick={handleGoogle} disabled={submitting} className="w-full">
          <GoogleIcon />
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 text-[13px] text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          o con tu correo
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-[#F07A5C]">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full mt-1">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="min-h-11 text-[14px] text-muted self-center"
        >
          {mode === "login" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
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
    default:
      return "Algo salió mal. Intenta de nuevo.";
  }
}
