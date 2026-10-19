"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/AuthProvider";

const STRENGTH_COLORS = ["var(--danger)", "var(--danger)", "var(--ink)", "var(--ink)"];
const STRENGTH_LABELS = ["", "Débil", "Regular", "Buena", "Fuerte"];

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
    <AuthShell eyebrow="Crear cuenta" title={<>Empieza<br />tu cuenta</>}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <label className="block">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te llamas" className="mt-2" />
          {nameErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {nameErr}
            </span>
          )}
        </label>

        <label className="block">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="mt-2" />
          {emailErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {emailErr}
            </span>
          )}
        </label>

        <label className="block">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="mt-2"
          />
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="h-[5px] flex-1 rounded-chip" style={{ background: n <= strength ? STRENGTH_COLORS[strength - 1] : "var(--line)" }} />
            ))}
            <span className="label-xs min-w-[76px] text-right">{STRENGTH_LABELS[strength]}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="label-xs normal-case tracking-normal text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink">
              {show ? "Ocultar contraseña" : "Mostrar contraseña"}
            </button>
          </div>
          {passErr && (
            <span role="alert" className="mt-1.5 block text-[13px] font-medium text-danger">
              {passErr}
            </span>
          )}
        </label>

        <div className="flex items-start gap-3.5">
          <Switch checked={terms} onCheckedChange={setTerms} label="Aceptar términos" className="mt-0.5" />
          <span className="text-[14px] text-muted">Acepto los términos y la política de privacidad.</span>
        </div>
        {termsErr && (
          <span role="alert" className="-mt-4 block text-[13px] font-medium text-danger">
            {termsErr}
          </span>
        )}

        {error && (
          <p role="alert" className="m-0 text-[14px] font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>

        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="label-xs">o con correo</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <Button type="button" variant="outline" onClick={handleGoogle} disabled={submitting} className="w-full">
          {submitting ? "Conectando…" : "Registrarme con Google"}
        </Button>
      </form>

      <p className="m-0 mt-9 text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-ink underline decoration-border underline-offset-2 hover:decoration-ink">
          Iniciar sesión
        </Link>
      </p>
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
