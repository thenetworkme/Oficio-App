"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell, GoogleSwatch } from "@/components/auth/AuthShell";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";

const STRENGTH_COLORS = ["#FF9C9C", "#FFB36B", "#FFD84D", "#7BE0A4"];
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
    <AuthShell asideColor="#7CC4FF" bubble="¡Seremos buen equipo!" headline="Elige tu oficio. Yo te cuento las horas.">
      <div>
        <h1 className="m-0 text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[48px]">Empieza tu álbum de sellos.</h1>
        <p className="mb-0 mt-2.5 text-[18px] font-medium">Gratis. Te toma menos de un minuto.</p>
      </div>

      <button type="button" onClick={handleGoogle} disabled={submitting} className="bx press flex min-h-14 w-full items-center justify-center gap-3 bg-card text-[18px] font-bold disabled:opacity-60">
        <GoogleSwatch />
        {submitting ? "Conectando con Google…" : "Registrarme con Google"}
      </button>

      <div className="flex items-center gap-3.5" aria-hidden="true">
        <span className="h-0 flex-1 border-t-[3px] border-dashed border-ink" />
        <span className="label-xs">o con correo</span>
        <span className="h-0 flex-1 border-t-[3px] border-dashed border-ink" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Cómo te decimos?" style={nameErr ? { borderColor: "var(--danger)" } : undefined} />
          {nameErr && <span role="alert" className="text-[14px] font-bold text-danger">{nameErr}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" style={emailErr ? { borderColor: "var(--danger)" } : undefined} />
          {emailErr && <span role="alert" className="text-[14px] font-bold text-danger">{emailErr}</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="flex gap-2.5">
            <Input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={passErr ? { borderColor: "var(--danger)" } : undefined}
              className="flex-1"
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="bx press min-w-[96px] font-bold">
              {show ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Fuerza de la contraseña">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="h-3.5 flex-1 rounded-chip border-[3px] border-ink" style={{ background: n <= strength ? STRENGTH_COLORS[strength - 1] : "var(--card)" }} />
            ))}
            <span className="font-num min-w-[70px] text-right text-[13px] font-bold">{STRENGTH_LABELS[strength]}</span>
          </div>
          {passErr && <span role="alert" className="text-[14px] font-bold text-danger">{passErr}</span>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 font-medium">
          <input type="checkbox" checked={terms} onChange={() => setTerms((t) => !t)} className="mt-0.5 size-6 shrink-0 accent-[var(--ink)]" />
          <span>Acepto los términos y la política de privacidad.</span>
        </label>
        {termsErr && <span role="alert" className="text-[14px] font-bold text-danger">{termsErr}</span>}

        {error && (
          <p role="alert" className="m-0 text-[14px] font-bold text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bx press min-h-14 w-full text-[18px] font-bold text-ink-solid disabled:opacity-60"
          style={{ background: "var(--a2)" }}
        >
          {submitting ? "¡Cuenta creada!" : "Crear cuenta"}
        </button>
      </form>

      <p className="m-0 text-center font-medium">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-bold underline">
          Inicia sesión
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
