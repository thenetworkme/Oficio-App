"use client";

import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { useSound } from "@/lib/sound/SoundProvider";
import { getChallenge, getChallengeDay, saveChallengeDay } from "@/lib/firestore/challenges";
import { listSessionsSince } from "@/lib/firestore/sessions";
import { coinsPerSession, xpForSession } from "@/lib/economy";
import { dateForDayNumber, dayNumberForDate } from "@/lib/challenge";
import { dateKeyInTz } from "@/lib/tz";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import { uploadChallengePhoto, deleteChallengePhoto, validatePhoto, MAX_PHOTOS_PER_DAY } from "@/lib/storage/challenge-photos";
import type { Challenge } from "@/lib/types";

const TAG_OPTIONS = ["Técnica", "Teoría", "Repaso", "Proyecto", "Error", "Avance"];
const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];
const DIFF_LABELS = ["", "Muy fácil", "Fácil", "Justa", "Difícil", "Muy difícil"];
const PRESETS = [15, 30, 45, 60];

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2.5 block text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--card-solid-muted)" }}>
      {children}
    </span>
  );
}

export default function RetoDiaPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { skills } = useAppData();
  const timezone = profile?.timezone ?? "America/Santo_Domingo";
  const sound = useSound();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [min, setMin] = useState(0);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timerMinutesAvailable, setTimerMinutesAvailable] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getChallenge(id).then(setChallenge);
  }, [id]);

  const todayKey = dateKeyInTz(new Date(), timezone);
  const startKey = challenge ? dateKeyInTz(new Date(challenge.startedAt), timezone) : todayKey;
  const todayDayNumber = challenge ? Math.max(1, Math.min(challenge.totalDays, dayNumberForDate(startKey, todayKey))) : 1;
  const dayParam = search.get("day");
  const dayNumber = dayParam ? Math.max(1, parseInt(dayParam, 10) || todayDayNumber) : todayDayNumber;
  const dayDateKey = challenge ? dateForDayNumber(startKey, dayNumber) : todayKey;
  const isToday = dayNumber === todayDayNumber;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!challenge) return;
    setLoaded(false);
    getChallengeDay(challenge.id, dayNumber).then((d) => {
      setMin(d?.durationMin ?? 0);
      setNote(d?.note ?? "");
      setTags(d?.tags ?? []);
      setPhotos(d?.photoUrls ?? []);
      setMood(d?.mood ?? null);
      setDifficulty(d?.difficulty ?? null);
      setSaved(false);
      setLoaded(true);
    });
  }, [challenge, dayNumber]);

  useEffect(() => {
    if (!user || !challenge || !isToday) {
      setTimerMinutesAvailable(0);
      return;
    }
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    listSessionsSince(user.uid, dayStart.getTime()).then((sessions) => {
      const total = sessions
        .filter((s) => s.skillId === challenge.skillId && s.source === "timer")
        .reduce((acc, s) => acc + s.durationMin, 0);
      setTimerMinutesAvailable(total);
    });
  }, [user, challenge, isToday]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const skill = skills.find((s) => s.id === challenge?.skillId);
  const goal = challenge?.dailyGoalMin ?? 30;
  const reached = min >= goal;
  const coins = useMemo(() => coinsPerSession(min, mood), [min, mood]);
  const xp = useMemo(() => xpForSession(min, mood), [min, mood]);
  const tickCount = Math.max(goal, min, 30);

  async function handleFiles(files: FileList | null) {
    if (!files || !user || !challenge) return;
    const remaining = MAX_PHOTOS_PER_DAY - photos.length;
    const list = Array.from(files).slice(0, Math.max(0, remaining));
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        const err = validatePhoto(file);
        if (err) {
          window.alert(err === "too-large" ? `"${file.name}" pesa más de 8 MB.` : `"${file.name}" no es una imagen.`);
          continue;
        }
        const url = await uploadChallengePhoto(user.uid, challenge.id, dayNumber, file);
        setPhotos((prev) => [...prev, url]);
        setSaved(false);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    setSaved(false);
    await deleteChallengePhoto(url);
  }

  async function handleSave() {
    if (!user || !challenge) return;
    setSaving(true);
    try {
      await saveChallengeDay({
        userId: user.uid,
        challengeId: challenge.id,
        skillId: challenge.skillId,
        dayNumber,
        date: dayDateKey,
        durationMin: min,
        note,
        tags,
        photoUrls: photos,
        mood,
        difficulty,
      });
      setSaved(true);
      sound.playSuccess();
    } finally {
      setSaving(false);
    }
  }

  if (!challenge || !loaded) {
    return (
      <>
        <ModeBackdrop />
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="text-[15px] text-mode-ink-muted">Cargando día…</span>
        </div>
      </>
    );
  }

  return (
    <>
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 text-mode-ink">
        <div>
          <Link href={`/retos/${challenge.id}`} className="mb-2 inline-flex items-center gap-1 text-[14px]" style={{ color: "var(--mode-ink-muted)" }}>
            <ChevronLeft />
            {challenge.name}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-tight">Día {dayNumber}</h1>
              <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
                {formatShortDateEs(new Date(`${dayDateKey}T00:00:00`))} · mínimo {goal} minutos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dayNumber > 1 ? (
                <Button asChild variant="onColor" size="iconSm">
                  <Link href={`/retos/${challenge.id}/dia?day=${dayNumber - 1}`} aria-label={`Día ${dayNumber - 1}`}>
                    <ChevronLeft />
                  </Link>
                </Button>
              ) : (
                <Button variant="onColor" size="iconSm" disabled aria-label="No hay día anterior">
                  <ChevronLeft />
                </Button>
              )}
              {dayNumber < todayDayNumber ? (
                <Button asChild variant="onColor" size="iconSm">
                  <Link href={`/retos/${challenge.id}/dia?day=${dayNumber + 1}`} aria-label={`Día ${dayNumber + 1}`}>
                    <ChevronRight />
                  </Link>
                </Button>
              ) : (
                <Button variant="onColor" size="iconSm" disabled aria-label="No hay día siguiente">
                  <ChevronRight />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card tone="solid" className="flex flex-col gap-6 p-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <SectionLabel>Tiempo de hoy</SectionLabel>
              <span className="font-num text-[14px] font-bold" style={{ color: "var(--card-solid-ink)" }}>
                {min} / {goal} min
              </span>
            </div>
            <div className="mb-4 flex gap-1">
              {Array.from({ length: tickCount }, (_, i) => (
                <span
                  key={i}
                  className="h-5 flex-1 rounded-sm"
                  style={{ background: i < min ? "var(--mode-bg)" : "var(--surface-muted)" }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                aria-label="Restar 5 minutos"
                onClick={() => {
                  setMin((m) => Math.max(0, m - 5));
                  setSaved(false);
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[18px] font-bold leading-none"
                style={{ background: "var(--surface-muted)", color: "var(--surface-muted-ink)" }}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Sumar 5 minutos"
                onClick={() => {
                  setMin((m) => m + 5);
                  setSaved(false);
                }}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-[18px] font-bold leading-none"
                style={{ background: "var(--surface-muted)", color: "var(--surface-muted-ink)" }}
              >
                +
              </button>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((v) => (
                  <Chip
                    key={v}
                    pressed={min === v}
                    onClick={() => {
                      setMin(v);
                      setSaved(false);
                    }}
                  >
                    {v} min
                  </Chip>
                ))}
              </div>
              {isToday && timerMinutesAvailable > 0 && (
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  onClick={() => {
                    setMin(timerMinutesAvailable);
                    setSaved(false);
                  }}
                >
                  Traer del Tomate ({formatMinutesLong(timerMinutesAvailable)})
                </Button>
              )}
            </div>
            <p className="font-num mt-3 text-[13px] font-semibold" style={{ color: reached ? "var(--mode-bg)" : "var(--card-solid-muted)" }}>
              {reached ? "✓ Meta del día cumplida. Hoy ya cuenta para tu racha." : `Te faltan ${goal - min} min para cumplir la meta de ${goal} min.`}
            </p>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--card-solid-line)" }}>
            <SectionLabel>¿Qué aprendí hoy?</SectionLabel>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder="Escribe lo que descubriste, lo que te costó y qué probarás mañana…"
              className="w-full resize-y rounded-button border-0 bg-surface-muted px-3.5 py-2.5 text-[15px] leading-snug text-surface-muted-ink outline-none placeholder:text-surface-muted-ink placeholder:opacity-60 focus:ring-2 focus:ring-[var(--mode-bg)]"
            />
            <div className="mt-1 text-right text-[12px]" style={{ color: "var(--card-solid-muted)" }}>
              {note.length} caracteres
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  pressed={tags.includes(t)}
                  onClick={() => {
                    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
                    setSaved(false);
                  }}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-8 border-t pt-6" style={{ borderColor: "var(--card-solid-line)" }}>
            <div className="flex flex-col gap-2">
              <SectionLabel>¿Cómo te fue?</SectionLabel>
              <div className="flex items-center gap-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <RatingDot
                    key={n}
                    active={mood !== null && n <= mood}
                    label={MOOD_LABELS[n]}
                    onClick={() => {
                      setMood(n);
                      setSaved(false);
                    }}
                  />
                ))}
              </div>
              <span className="text-[12px]" style={{ color: "var(--card-solid-muted)" }}>
                {mood ? MOOD_LABELS[mood] : "Sin elegir"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <SectionLabel>Dificultad</SectionLabel>
              <div className="flex items-center gap-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <RatingDot
                    key={n}
                    active={difficulty !== null && n <= difficulty}
                    label={`Dificultad ${n}`}
                    onClick={() => {
                      setDifficulty(n);
                      setSaved(false);
                    }}
                  />
                ))}
              </div>
              <span className="text-[12px]" style={{ color: "var(--card-solid-muted)" }}>
                {difficulty ? DIFF_LABELS[difficulty] : "1 = fácil · 5 = muy difícil"}
              </span>
            </div>
          </div>

          <div className="border-t pt-6" style={{ borderColor: "var(--card-solid-line)" }}>
            <div className="mb-2.5 flex items-center justify-between">
              <SectionLabel>Foto o audio</SectionLabel>
              <span className="text-[13px] font-semibold" style={{ color: "var(--card-solid-ink)" }}>
                {photos.length} / {MAX_PHOTOS_PER_DAY}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {photos.map((url) => (
                <div key={url} className="relative">
                  {/* Firebase Storage download URLs aren't in next.config's image domains, and these
                      are small user-uploaded thumbnails in a scrolling grid, not an LCP candidate. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Foto del día" className="size-[92px] rounded-card object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar foto"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full text-[13px]"
                    style={{ background: "var(--card-solid)", color: "var(--card-solid-ink)", boxShadow: "0 0 0 1px var(--card-solid-line)" }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS_PER_DAY && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Añadir foto"
                  className="flex size-[92px] flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed text-[11px]"
                  style={{ borderColor: "var(--card-solid-line)", color: "var(--card-solid-muted)" }}
                >
                  <PlusIcon />
                  {uploading ? "Subiendo…" : "Añadir"}
                </button>
              )}
            </div>
            <p className="mt-3 text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
              Arrastra imágenes aquí. Se guardan con la fecha del día.
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: "var(--card-solid-line)" }}>
            <span className="text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
              Recompensa: +{coins} monedas · +{xp} XP
            </span>
            <div className="flex gap-2.5">
              <Button asChild variant="light" size="md">
                <Link href={`/retos/${challenge.id}`}>Cancelar</Link>
              </Button>
              <Button variant="dark" size="md" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : saved ? "¡Día guardado!" : `Guardar día ${dayNumber}`}
              </Button>
            </div>
          </div>
          {saved && (
            <div className="-mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
                Sumaste {coins} monedas y {xp} XP. Sigues aprendiendo {skill?.name ?? ""}.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/retos/${challenge.id}`)}
                className="shrink-0 text-[13px] font-semibold underline underline-offset-2"
                style={{ color: "var(--mode-bg)" }}
              >
                Volver al tablero →
              </button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function RatingDot({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className="size-7 rounded-full transition-colors"
      style={{ background: active ? "var(--mode-bg)" : "var(--surface-muted)" }}
    />
  );
}
