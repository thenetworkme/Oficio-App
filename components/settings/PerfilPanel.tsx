"use client";

import { sendEmailVerification, updateProfile as updateAuthProfile } from "firebase/auth";
import { Download, KeyRound, LogOut, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { exportUserDataToCsv } from "@/lib/csv-export";
import { getFirebaseAuth } from "@/lib/firebase";
import { formatInt, formatMonthYearEs } from "@/lib/format";
import { updateProfile as updateProfileDoc } from "@/lib/firestore/profiles";
import { useAppData } from "@/lib/hooks/useAppData";
import { computeBestStreak } from "@/lib/streak";

const TIMEZONES = [
  "America/Santo_Domingo",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "Europe/Madrid",
];

const STREAK_OPTIONS = [15, 30, 45, 60, 90];

function initialOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name && name.trim()) || email || "?";
  return source.charAt(0).toUpperCase();
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-2">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`Restar a ${label}`}
          onClick={() => onChange(Math.max(min, value - 5))}
          className="flex size-11 items-center justify-center rounded-full border border-muted text-text"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className="font-num min-w-16 text-center text-[16px]">{value} min</span>
        <button
          type="button"
          aria-label={`Sumar a ${label}`}
          onClick={() => onChange(Math.min(max, value + 5))}
          className="flex size-11 items-center justify-center rounded-full border border-muted text-text"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (next.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres.");
    if (next !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onOpenChange(false);
    } catch {
      setError("No se pudo cambiar la contraseña. Revisa tu contraseña actual.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <div className="flex flex-col gap-5">
          <DialogTitle className="m-0 text-2xl font-extrabold">Cambiar contraseña</DialogTitle>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-current">Contraseña actual</Label>
            <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-next">Nueva contraseña</Label>
            <Input id="cp-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-confirm">Confirmar nueva contraseña</Label>
            <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={busy || !current || !next}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { deleteAccount, hasPasswordProvider } = useAuth();
  const usesPassword = hasPasswordProvider();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSubmit = confirmText === "ELIMINAR" && (!usesPassword || password.length > 0);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(usesPassword ? password : undefined);
      // On success, Firebase Auth signs the user out; AppShell redirects to /login.
    } catch {
      setError("No se pudo eliminar la cuenta. Vuelve a iniciar sesión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <div className="flex flex-col gap-5">
          <DialogTitle className="m-0 text-2xl font-extrabold text-danger">Eliminar cuenta</DialogTitle>
          <p className="m-0 text-muted">
            Esto borra permanentemente todas tus habilidades, sesiones, logros y recordatorios. No se puede deshacer.
          </p>
          {usesPassword && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="del-pass">Contraseña actual</Label>
              <Input id="del-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-confirm">
              Escribe <strong>ELIMINAR</strong> para confirmar
            </Label>
            <Input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <Button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="border border-danger bg-transparent text-danger hover:brightness-100 hover:bg-danger/10"
          >
            {busy ? "Eliminando…" : "Eliminar cuenta para siempre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PerfilPanel() {
  const { user, profile, signOut, hasPasswordProvider } = useAuth();
  const { skills, dailyMinutes, totalHours } = useAppData();

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/Santo_Domingo");
  const [dailyMin, setDailyMin] = useState(30);
  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Sync local form state once the profile doc loads (and whenever it changes elsewhere).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? user?.displayName ?? "");
    setTimezone(profile.timezone);
    setDailyMin(profile.dailyMinForStreak);
    setFocusMin(profile.pomodoroFocusMin);
    setShortMin(profile.pomodoroShortMin);
    setLongMin(profile.pomodoroLongMin);
  }, [profile, user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!user) return null;

  const bestStreak = computeBestStreak(dailyMinutes, profile?.dailyMinForStreak ?? 30);
  const memberSinceMs = user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : (profile?.createdAt ?? null);
  const timezoneOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  async function handleSave() {
    setSaving(true);
    setSavedNote("");
    try {
      await updateProfileDoc(user!.uid, {
        displayName: displayName.trim() || null,
        timezone,
        dailyMinForStreak: dailyMin,
        pomodoroFocusMin: focusMin,
        pomodoroShortMin: shortMin,
        pomodoroLongMin: longMin,
      });
      const authUser = getFirebaseAuth().currentUser;
      if (authUser && authUser.displayName !== displayName.trim()) {
        await updateAuthProfile(authUser, { displayName: displayName.trim() || null });
      }
      setSavedNote("Cambios guardados");
    } catch {
      setSavedNote("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserDataToCsv(user!.uid);
    } finally {
      setExporting(false);
    }
  }

  async function handleResendVerification() {
    const authUser = getFirebaseAuth().currentUser;
    if (!authUser) return;
    await sendEmailVerification(authUser);
    setVerificationSent(true);
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
        <Card className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap items-center gap-4.5">
            <span
              aria-hidden="true"
              className="flex size-18 shrink-0 items-center justify-center rounded-full text-[32px] font-extrabold"
              style={{ background: "var(--accent)", color: "var(--on)" }}
            >
              {initialOf(displayName, user.email)}
            </span>
            <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
              <span className="text-2xl font-extrabold tracking-tight">{displayName || user.email}</span>
              <span className="text-sm text-muted">
                {user.email}
                {memberSinceMs ? ` · Miembro desde ${formatMonthYearEs(new Date(memberSinceMs))}` : ""}
              </span>
            </div>
            <Button variant="outline" size="sm" disabled title="Próximamente: requiere Firebase Storage">
              Cambiar foto
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
            <div className="flex flex-col gap-0.5 rounded-xl border border-line p-3.5">
              <span className="label-xs">Horas totales</span>
              <span className="font-num text-2xl font-medium text-accent">{formatInt(totalHours)} h</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-line p-3.5">
              <span className="label-xs">Habilidades</span>
              <span className="font-num text-2xl font-medium">{skills.length}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-line p-3.5">
              <span className="label-xs">Mejor racha</span>
              <span className="font-num text-2xl font-medium">{bestStreak} días</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <CardHeading>Datos personales</CardHeading>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-name">Nombre para mostrar</Label>
            <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-mail">Correo</Label>
            <div className="flex flex-wrap items-center gap-2.5">
              <Input id="p-mail" type="email" value={user.email ?? ""} readOnly className="flex-1 basis-56 text-muted" />
              {user.emailVerified ? (
                <span
                  className="label-xs rounded-chip border px-2.5 py-1"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  Verificado
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={verificationSent}>
                  {verificationSent ? "Correo enviado" : "Verificar correo"}
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-tz">Zona horaria</Label>
              <select
                id="p-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="box-border min-h-[46px] w-full rounded-button border border-line bg-bg px-3 text-[15px]"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-lang">Idioma</Label>
              <select
                id="p-lang"
                value="es"
                disabled
                title="Muy pronto más idiomas"
                className="box-border min-h-[46px] w-full rounded-button border border-line bg-bg px-3 text-[15px] text-muted"
              >
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <CardHeading>Práctica</CardHeading>
          <div role="group" aria-label="Mínimo diario para la racha" className="flex flex-col gap-2.5">
            <span className="text-[13px] text-muted">Mínimo diario para mantener la racha</span>
            <div className="flex flex-wrap gap-2">
              {STREAK_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={dailyMin === m}
                  onClick={() => setDailyMin(m)}
                  className="font-num min-h-11 rounded-button border px-4"
                  style={{ borderColor: dailyMin === m ? "var(--accent)" : "var(--line)", background: dailyMin === m ? "var(--track)" : "transparent" }}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Duración del Pomodoro" className="flex flex-col gap-1">
            <span className="mb-1 text-[13px] text-muted">Duración del Pomodoro</span>
            <Stepper label="Enfoque" value={focusMin} min={1} max={90} onChange={setFocusMin} />
            <Stepper label="Descanso corto" value={shortMin} min={1} max={30} onChange={setShortMin} />
            <Stepper label="Descanso largo" value={longMin} min={1} max={60} onChange={setLongMin} />
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3.5">
          <span role="status" className="text-sm text-muted">
            {savedNote}
          </span>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <aside className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
        <Card className="flex flex-col gap-3 p-5.5">
          <CardHeading className="mb-1">Cuenta</CardHeading>
          {hasPasswordProvider() ? (
            <Button variant="outline" className="justify-start gap-3" onClick={() => setPasswordDialogOpen(true)}>
              <KeyRound size={20} aria-hidden="true" />
              Cambiar contraseña
            </Button>
          ) : (
            <p className="m-0 text-sm text-muted">Iniciaste sesión con Google, no tienes contraseña que cambiar aquí.</p>
          )}
          <Button variant="outline" className="justify-start gap-3" onClick={handleExport} disabled={exporting}>
            <Download size={20} aria-hidden="true" />
            {exporting ? "Exportando…" : "Exportar mis datos (CSV)"}
          </Button>
          <Button variant="subtle" className="justify-start gap-3 font-bold" onClick={signOut}>
            <LogOut size={20} aria-hidden="true" />
            Cerrar sesión
          </Button>
        </Card>

        <Card className="flex flex-col gap-3 p-5.5" style={{ borderColor: "var(--danger)" }}>
          <CardHeading className="text-danger">Zona de riesgo</CardHeading>
          <p className="m-0 text-sm text-muted">
            Eliminar tu cuenta borra todas tus habilidades, sesiones y logros. No se puede deshacer.
          </p>
          <div>
            <Button
              className="border border-danger bg-transparent font-bold text-danger hover:brightness-100 hover:bg-danger/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Eliminar cuenta
            </Button>
          </div>
        </Card>
      </aside>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}
