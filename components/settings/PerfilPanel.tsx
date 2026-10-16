"use client";

import { sendEmailVerification, updateProfile as updateAuthProfile } from "firebase/auth";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { useSound } from "@/lib/sound/SoundProvider";
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

// Pomodoro-duration presets, matching design-reference/punto/html/
// PuntoAjustes.dc.html's `pomo` chip row exactly (25/5/15, 50/10/20,
// 90/15/30). Real per-field minutes (focusMin/shortMin/longMin) are still
// what's actually saved — a preset just sets all three at once. If a
// profile holds a value combination that isn't one of these three (e.g.
// older custom data), no chip shows pressed, which is fine: the fields
// still carry their real values and saving still writes them correctly.
const POMODORO_PRESETS: { label: string; focus: number; short: number; long: number }[] = [
  { label: "25 / 5 / 15", focus: 25, short: 5, long: 15 },
  { label: "50 / 10 / 20", focus: 50, short: 10, long: 20 },
  { label: "90 / 15 / 30", focus: 90, short: 15, long: 30 },
];

function initialOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name && name.trim()) || email || "?";
  return source.charAt(0).toUpperCase();
}

function Stepper({
  label,
  description,
  value,
  min,
  max,
  step = 5,
  unit = "min",
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-line py-5 first:border-t-0">
      <div className="flex flex-col gap-0.5">
        <span className="label-xs">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </div>
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label={`Restar a ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex size-11 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-border-hover hover:bg-card"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <span className="font-num min-w-20 text-center text-[20px]">
          {value} {unit}
        </span>
        <button
          type="button"
          aria-label={`Sumar a ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex size-11 items-center justify-center rounded-full border border-border text-ink transition-colors hover:border-border-hover hover:bg-card"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function PerfilPanel() {
  const { user, profile } = useAuth();
  const { skills, dailyMinutes, totalHours } = useAppData();
  const sound = useSound();
  const notifications = useNotifications();
  const [notificationsNote, setNotificationsNote] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/Santo_Domingo");
  const [dailyMin, setDailyMin] = useState(30);
  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
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
  const activePomodoroPreset = POMODORO_PRESETS.findIndex(
    (p) => p.focus === focusMin && p.short === shortMin && p.long === longMin,
  );

  function applyPomodoroPreset(preset: (typeof POMODORO_PRESETS)[number]) {
    setFocusMin(preset.focus);
    setShortMin(preset.short);
    setLongMin(preset.long);
  }

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
      sound.playSuccess();
    } catch {
      setSavedNote("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleNotifications(next: boolean) {
    setNotificationsNote("");
    const outcome = await notifications.setNotificationsEnabled(next);
    if (outcome === "denied") {
      setNotificationsNote(
        "Bloqueaste los avisos en tu navegador. Para activarlos, cámbialo desde los ajustes de notificaciones del navegador.",
      );
    } else if (outcome === "unsupported") {
      setNotificationsNote("Tu navegador no admite notificaciones de escritorio.");
    }
  }

  async function handleResendVerification() {
    const authUser = getFirebaseAuth().currentUser;
    if (!authUser) return;
    await sendEmailVerification(authUser);
    setVerificationSent(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-6 p-7">
        <span
          aria-hidden="true"
          className="flex size-[120px] shrink-0 items-center justify-center rounded-full border border-border text-[48px] font-light"
        >
          {initialOf(displayName, user.email)}
        </span>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[26px] font-medium tracking-tight">{displayName || user.email}</span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
            {user.email}
            {memberSinceMs ? ` · Desde ${formatMonthYearEs(new Date(memberSinceMs))}` : ""}
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3 sm:min-w-[420px]">
          <div className="flex flex-col gap-0.5 rounded-card border border-line px-4 py-3">
            <span className="label-xs">Horas totales</span>
            <span className="font-num text-2xl font-medium">{formatInt(totalHours)} h</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-card border border-line px-4 py-3">
            <span className="label-xs">Habilidades</span>
            <span className="font-num text-2xl font-medium">{skills.length}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-card border border-line px-4 py-3">
            <span className="label-xs">Mejor racha</span>
            <span className="font-num text-2xl font-medium">{bestStreak} días</span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-7">
        <CardHeading>Datos personales</CardHeading>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-name">Nombre</Label>
          <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-mail">Correo</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            <Input id="p-mail" type="email" value={user.email ?? ""} readOnly className="flex-1 basis-56 text-muted" />
            {user.emailVerified ? (
              <span className="label-xs inline-flex items-center gap-2 rounded-chip border border-line px-3 py-1.5">
                <span className="size-1.5 rounded-full" style={{ background: "var(--signal)" }} />
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
              className="box-border min-h-[46px] w-full rounded-button border border-border bg-transparent px-3.5 text-[15px] text-ink transition-colors hover:border-border-hover"
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
              className="box-border min-h-[46px] w-full rounded-button border border-border bg-transparent px-3.5 text-[15px] text-muted"
            >
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-7">
        <CardHeading className="mb-2">Práctica</CardHeading>
        <Stepper
          label="Mínimo diario para la racha"
          description="Minutos que cuentan para no perder tu racha"
          value={dailyMin}
          min={5}
          max={120}
          step={5}
          onChange={setDailyMin}
        />
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-line py-5">
          <div className="flex flex-col gap-0.5">
            <span className="label-xs">Duración del Pomodoro</span>
            <span className="text-sm text-muted">Foco / descanso corto / descanso largo</span>
          </div>
          <div role="group" aria-label="Duración del Pomodoro" className="flex flex-wrap justify-end gap-2">
            {POMODORO_PRESETS.map((preset, i) => (
              <Chip key={preset.label} pressed={activePomodoroPreset === i} onClick={() => applyPomodoroPreset(preset)}>
                {preset.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-7">
        <CardHeading>Sonido</CardHeading>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-2">
          <span className="text-[15px]">Efectos de sonido</span>
          <Switch checked={sound.soundEffectsEnabled} onCheckedChange={sound.setSoundEffectsEnabled} label="Efectos de sonido" />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="fx-volume" className="text-sm text-muted">
            Volumen de efectos
          </label>
          <input
            id="fx-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.soundEffectsVolume}
            disabled={!sound.soundEffectsEnabled}
            onChange={(e) => sound.setSoundEffectsVolume(Number(e.target.value))}
            className="h-2 flex-1 accent-[var(--signal)] disabled:opacity-40"
            aria-label="Volumen de los efectos de sonido"
          />
        </div>
        <AmbientPicker />
      </Card>

      <Card className="flex flex-col gap-3 p-7">
        <CardHeading>Notificaciones</CardHeading>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px]">Avisos de escritorio</span>
            <span className="text-sm text-muted">
              Te avisamos cuando termine un tomate o un descanso, aunque la pestaña esté en segundo plano.
            </span>
          </div>
          <Switch checked={notifications.notificationsEnabled} onCheckedChange={handleToggleNotifications} label="Avisos de escritorio" />
        </div>
        {notificationsNote && (
          <p role="status" className="m-0 text-sm text-muted">
            {notificationsNote}
          </p>
        )}
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
  );
}
