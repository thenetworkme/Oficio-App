"use client";

import { sendEmailVerification, updateProfile as updateAuthProfile } from "firebase/auth";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

// Rebuilt against design-reference/pomodoro/html/PomoAjustes.dc.html. That
// reference's own Ajustes is a tiny modal with ONLY: Foco/Descanso corto/
// Descanso largo durations, auto-start-breaks/auto-start-focus toggles,
// "descanso largo cada N" sessions, "meta diaria (horas)", a "sonido de
// alarma" dropdown, a fixed-time daily-reminder toggle, and the static
// color swatches (handled in AparienciaPanel).
//
// Of those, only the 3 Pomodoro durations and a sound control have a real
// backing field in this app's data model (Profile.pomodoroFocusMin/
// ShortMin/LongMin, soundEffectsEnabled/Volume, ambientSoundId/Volume —
// lib/types.ts). The rest — auto-start-breaks, auto-start-focus,
// "descanso largo cada N" (sessions before a long break), a hour-based
// daily goal distinct from the real per-skill goalHours, and a
// fixed-clock-time daily reminder — do NOT exist anywhere in this app's
// Firestore schema, store/timer-store.ts, or lib/notifications/. Per this
// phase's own scope guardrails ("do NOT touch Firestore/business logic"),
// those toggles/fields are NOT fabricated here with local-only state that
// would silently do nothing when saved — same precedent CuentaPanel
// already set by dropping the reference's "Conectar calendario" row. The
// closest REAL equivalents are kept and placed in the reference's rough
// field order instead: durations first, then sound, then the real
// notification toggle plus a link to the real /recordatorios (Avisos)
// feature, which is this app's actual fixed-time reminder system (a
// different, already-shoipped page — not touched here, just linked to).
// Perfil's own identity fields (name/correo/zona horaria/idioma, lifetime
// stats) and the daily-streak-minimum practice setting have no reference
// equivalent at all, so they're kept as additional sections below, per
// the phase brief ("add whatever doesn't have a reference equivalent...
// rather than dropping any of it").
const POMODORO_PRESETS: { label: string; focus: number; short: number; long: number }[] = [
  { label: "25 / 5 / 15", focus: 25, short: 5, long: 15 },
  { label: "50 / 10 / 20", focus: 50, short: 10, long: 20 },
  { label: "90 / 15 / 30", focus: 90, short: 15, long: 30 },
];

const TIMEZONES = [
  "America/Santo_Domingo",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "Europe/Madrid",
];

function initialOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name && name.trim()) || email || "?";
  return source.charAt(0).toUpperCase();
}

/** A section inside the single white `tone="solid"` Ajustes panel — a small
 * caps label + its rows, separated from the previous section by a hairline
 * that uses `--card-solid-line` (NOT the legacy `--line`, which sits far
 * too close in luminance to `--card-solid` in dark mode — see the final
 * report for the contrast check this caught). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-card-solid-line pt-7 first:border-t-0 first:pt-0">
      <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-card-solid-muted">{title}</h3>
      {children}
    </section>
  );
}

/** Pill-shaped chip with a defensive 1px inset ring: inside a `tone="solid"`
 * card, Chip's pressed state (`--flat-dark`, #222) sits almost exactly on
 * top of `--card-solid`'s dark-mode value (#202024) — a ~2-unit luminance
 * gap, invisible in practice. The ring (card-solid-line, the token this
 * surface's own dividers use) keeps the chip's edge legible in both
 * states/both themes without touching the shared Chip component used by
 * other in-progress screens. */
function PanelChip(props: React.ComponentProps<typeof Chip>) {
  return <Chip {...props} className="ring-1 ring-inset ring-card-solid-line" />;
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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {description && <span className="text-sm text-card-solid-muted">{description}</span>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Restar a ${label}`}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex size-9 items-center justify-center rounded-full border border-border text-card-solid-ink transition-colors hover:border-border-hover hover:bg-surface-muted"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span className="font-num min-w-[68px] text-center text-[17px]">
          {value} {unit}
        </span>
        <button
          type="button"
          aria-label={`Sumar a ${label}`}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex size-9 items-center justify-center rounded-full border border-border text-card-solid-ink transition-colors hover:border-border-hover hover:bg-surface-muted"
        >
          <Plus size={16} aria-hidden="true" />
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
    <div className="flex flex-col gap-7">
      <Section title="Temporizador">
        <div role="group" aria-label="Plantillas de temporizador" className="flex flex-wrap gap-2">
          {POMODORO_PRESETS.map((preset, i) => (
            <PanelChip key={preset.label} pressed={activePomodoroPreset === i} onClick={() => applyPomodoroPreset(preset)}>
              {preset.label}
            </PanelChip>
          ))}
        </div>
        <div className="flex flex-col gap-3.5 rounded-button bg-surface-muted/40 p-4">
          <Stepper label="Foco" value={focusMin} min={5} max={180} step={5} onChange={setFocusMin} />
          <Stepper label="Descanso corto" value={shortMin} min={1} max={30} step={1} onChange={setShortMin} />
          <Stepper label="Descanso largo" value={longMin} min={5} max={60} step={5} onChange={setLongMin} />
        </div>
      </Section>

      <Section title="Sonido">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">Efectos de sonido</span>
          <Switch checked={sound.soundEffectsEnabled} onCheckedChange={sound.setSoundEffectsEnabled} label="Efectos de sonido" />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="fx-volume" className="text-sm text-card-solid-muted">
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
            className="h-2 flex-1 accent-[var(--mode-bg)] disabled:opacity-40"
            aria-label="Volumen de los efectos de sonido"
          />
        </div>
        <AmbientPicker />
      </Section>

      <Section title="Avisos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Avisos de escritorio</span>
            <span className="text-sm text-card-solid-muted">
              Te avisamos cuando termine un tomate o un descanso, aunque la pestaña esté en segundo plano.
            </span>
          </div>
          <Switch checked={notifications.notificationsEnabled} onCheckedChange={handleToggleNotifications} label="Avisos de escritorio" />
        </div>
        {notificationsNote && (
          <p role="status" className="m-0 text-sm text-card-solid-muted">
            {notificationsNote}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Recordatorios diarios</span>
            <span className="text-sm text-card-solid-muted">Avisos a una hora fija, por habilidad — gestiónalos aparte.</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/recordatorios">Ver recordatorios</Link>
          </Button>
        </div>
      </Section>

      <Section title="Identidad">
        <div className="flex flex-wrap items-center gap-5">
          <span
            aria-hidden="true"
            className="flex size-[72px] shrink-0 items-center justify-center rounded-full border border-border text-[28px] font-light"
          >
            {initialOf(displayName, user.email)}
          </span>
          <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
            <span className="text-[19px] font-medium tracking-tight">{displayName || user.email}</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-card-solid-muted">
              {user.email}
              {memberSinceMs ? ` · Desde ${formatMonthYearEs(new Date(memberSinceMs))}` : ""}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5 rounded-button border border-card-solid-line px-3.5 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-card-solid-muted">Horas totales</span>
            <span className="font-num text-xl font-medium">{formatInt(totalHours)} h</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-button border border-card-solid-line px-3.5 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-card-solid-muted">Habilidades</span>
            <span className="font-num text-xl font-medium">{skills.length}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-button border border-card-solid-line px-3.5 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-card-solid-muted">Mejor racha</span>
            <span className="font-num text-xl font-medium">{bestStreak} días</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-name">Nombre</Label>
          <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-mail">Correo</Label>
          <div className="flex flex-wrap items-center gap-2.5">
            <Input id="p-mail" type="email" value={user.email ?? ""} readOnly className="flex-1 basis-56 opacity-70" />
            {user.emailVerified ? (
              <span className="label-xs inline-flex items-center gap-2 rounded-chip border border-card-solid-line px-3 py-1.5">
                <span className="size-1.5 rounded-full" style={{ background: "var(--mode-short)" }} />
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
              className="box-border min-h-11 w-full rounded-button border-0 bg-surface-muted px-3.5 text-[15px] text-surface-muted-ink transition-colors"
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
              className="box-border min-h-11 w-full rounded-button border-0 bg-surface-muted px-3.5 text-[15px] text-surface-muted-ink opacity-70"
            >
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Práctica">
        <Stepper
          label="Mínimo diario para la racha"
          description="Minutos que cuentan para no perder tu racha"
          value={dailyMin}
          min={5}
          max={120}
          step={5}
          onChange={setDailyMin}
        />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3.5 border-t border-card-solid-line pt-6">
        <span role="status" className="text-sm text-card-solid-muted">
          {savedNote}
        </span>
        {/* NOT variant="dark": its flat #222 fill sits ~2 luminance units off
         * --card-solid's dark-mode value (#202024) — confirmed via a real-
         * Chromium dark-mode screenshot to render as text with no visible
         * button underneath it. --mode-bg (always a saturated red/teal/
         * blue) reads clearly against both the white and near-black
         * --card-solid, so the primary action here uses that instead. */}
        <Button
          size="md"
          style={{ background: "var(--mode-bg)", borderColor: "var(--mode-bg)", color: "#fff" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
