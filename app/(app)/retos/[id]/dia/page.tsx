"use client";

import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
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
const PRESETS = [15, 30, 45, 60];

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
  const goalPct = Math.min(100, Math.round((min / Math.max(1, goal)) * 100));
  const coins = useMemo(() => coinsPerSession(min, mood), [min, mood]);
  const xp = useMemo(() => xpForSession(min, mood), [min, mood]);

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
    return <p className="text-sm text-muted">Cargando día…</p>;
  }

  return (
    <>
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2.5">
        <Link href="/retos" className="bx press flex min-h-11 items-center px-4 font-bold">
          ← Retos
        </Link>
        <span className="label-xs">Diario del día</span>
      </nav>

      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="label-xs">
            {challenge.name} · {formatShortDateEs(new Date(`${dayDateKey}T00:00:00`))}
          </span>
          <h1 className="m-0 mt-2 text-[48px] font-bold leading-[0.95] tracking-tight sm:text-[64px]">Día {dayNumber}.</h1>
        </div>
        <div className="flex gap-2.5">
          <Link
            href={dayNumber > 1 ? `/retos/${challenge.id}/dia?day=${dayNumber - 1}` : "#"}
            aria-disabled={dayNumber <= 1}
            className="bx press flex min-h-11 items-center px-4 font-bold"
            style={dayNumber <= 1 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            ← Día {dayNumber - 1}
          </Link>
          <Link
            href={dayNumber < todayDayNumber ? `/retos/${challenge.id}/dia?day=${dayNumber + 1}` : "#"}
            aria-disabled={dayNumber >= todayDayNumber}
            className="bx press flex min-h-11 items-center px-4 font-bold"
            style={dayNumber >= todayDayNumber ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            Día {dayNumber + 1} →
          </Link>
        </div>
      </section>

      <section className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-7">
          <div className="bx flex flex-col gap-4 p-6.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="label-xs">1 · Tiempo invertido</span>
              {isToday && timerMinutesAvailable > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMin(timerMinutesAvailable);
                    setSaved(false);
                  }}
                  className="min-h-9 rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold text-ink-solid"
                  style={{ background: "var(--a2)" }}
                >
                  Traer del Tomate ({formatMinutesLong(timerMinutesAvailable)})
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4.5">
              <button
                type="button"
                aria-label="Restar 5 minutos"
                onClick={() => {
                  setMin((m) => Math.max(0, m - 5));
                  setSaved(false);
                }}
                className="bx press flex size-15 items-center justify-center text-[28px] font-bold"
              >
                −
              </button>
              <div aria-live="polite" className="font-num min-w-[200px] text-center text-[56px] font-bold leading-none sm:text-[68px]">
                {formatMinutesLong(min)}
              </div>
              <button
                type="button"
                aria-label="Sumar 5 minutos"
                onClick={() => {
                  setMin((m) => m + 5);
                  setSaved(false);
                }}
                className="bx press flex size-15 items-center justify-center text-[28px] font-bold text-ink-solid"
                style={{ background: challenge.color }}
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
            </div>
            <ProgressBar pct={goalPct} color={reached ? "var(--a3)" : "var(--a1)"} ariaLabel="Meta del día" height={22} />
            <div className="flex items-center gap-2.5 font-bold">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-button border-[3px] border-ink text-sm"
                style={{ background: reached ? "var(--a3)" : "var(--a1)" }}
              >
                {reached ? "✓" : ""}
              </span>
              <span>
                {reached
                  ? "¡Meta del día cumplida! Hoy ya cuenta para tu racha."
                  : `Te faltan ${goal - min} min para cumplir la meta de ${goal} min.`}
              </span>
            </div>
          </div>

          <div className="bx flex flex-col gap-4 p-6.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="label-xs">2 · ¿Qué aprendí hoy?</span>
            </div>
            <textarea
              rows={5}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder="Hoy practiqué…"
              className="box-border w-full resize-y rounded-button border-[3px] border-ink bg-card px-3.5 py-3 text-lg leading-snug text-ink placeholder:text-muted"
            />
            <div className="font-num text-right text-xs text-muted">{note.length} caracteres</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-xs mr-1.5">Etiquetas</span>
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  pressed={tags.includes(t)}
                  onClick={() => {
                    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
                    setSaved(false);
                  }}
                  style={tags.includes(t) ? { background: "#7CC4FF" } : undefined}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="bx flex flex-col gap-4 p-6.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="label-xs">3 · Fotos del día</span>
              <span className="font-num text-[13px] text-muted">
                {photos.length} {photos.length === 1 ? "foto" : "fotos"} · máx. {MAX_PHOTOS_PER_DAY}
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {photos.map((url) => (
                <div key={url} className="relative">
                  {/* Firebase Storage download URLs aren't in next.config's image domains, and these
                      are small user-uploaded thumbnails in a scrolling grid, not an LCP candidate. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Foto del día" className="h-[140px] w-full rounded-button border-[3px] border-ink object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar foto"
                    onClick={() => handleRemovePhoto(url)}
                    className="bx absolute -right-2 -top-2.5 flex size-8.5 items-center justify-center rounded-full font-bold text-ink-solid"
                    style={{ background: "var(--a2)" }}
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
                  className="hov flex h-[140px] flex-col items-center justify-center gap-1.5 rounded-button border-[3px] border-dashed border-ink text-base font-bold"
                >
                  <span className="text-[32px] leading-none">+</span>
                  {uploading ? "Subiendo…" : "Subir foto"}
                  <span className="font-num text-[11px] font-normal text-muted">o arrastra aquí</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="bx flex flex-wrap gap-9 p-6.5">
            <div className="flex flex-col gap-2.5">
              <span className="label-xs">4 · ¿Cómo te fue?</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={mood === n}
                    aria-label={MOOD_LABELS[n]}
                    onClick={() => {
                      setMood(n);
                      setSaved(false);
                    }}
                    className="bx press flex size-15 items-center justify-center text-[22px] font-bold"
                    style={{ background: mood === n ? "var(--a2)" : "var(--card)", boxShadow: mood === n ? "5px 5px 0 var(--shadow)" : undefined }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="font-num text-[13px] font-bold">{mood ? MOOD_LABELS[mood] : "Sin elegir"}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="label-xs">Dificultad de hoy</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={difficulty === n}
                    aria-label={`Dificultad ${n}`}
                    onClick={() => {
                      setDifficulty(n);
                      setSaved(false);
                    }}
                    className="bx press flex size-15 items-center justify-center text-[22px] font-bold"
                    style={{ background: difficulty === n ? "var(--a1)" : "var(--card)", boxShadow: difficulty === n ? "5px 5px 0 var(--shadow)" : undefined }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="font-num text-[13px] text-muted">1 = fácil · 5 = muy difícil</span>
            </div>
          </div>
        </div>

        <aside className="sticky top-5 flex min-w-0 flex-[1_1_320px] flex-col gap-6.5">
          <div className="bx p-6.5 text-ink-solid" style={{ background: challenge.color, transform: "rotate(1.2deg)" }}>
            <span className="label-xs !text-ink-solid opacity-80">Resumen del día {dayNumber}</span>
            <div className="font-num mt-1 text-[48px] font-bold leading-[1.05]">{formatMinutesLong(min)}</div>
            <span className="font-num text-[13px]">
              {tags.length} {tags.length === 1 ? "etiqueta" : "etiquetas"} · {skill?.name}
            </span>
          </div>
          <div className="bx flex flex-col gap-2.5 p-5.5">
            <RewardRow k="Monedas" v={`+${coins}`} />
            <RewardRow k="XP" v={`+${xp}`} />
            <RewardRow k="Aporta a" v={`${skill?.name ?? ""} · ${formatMinutesLong(min)}`} />
            <RewardRow k="Fotos y nota" v={`${photos.length} foto(s) + ${note.length > 0 ? "nota" : "sin nota"}`} last />
          </div>
          <Button onClick={handleSave} disabled={saving} size="default" className="w-full" style={{ background: saved ? "var(--a3)" : challenge.color }}>
            {saving ? "Guardando…" : saved ? "¡Día guardado!" : `Guardar día ${dayNumber}`}
          </Button>
          <div className="bx p-4.5" style={{ background: saved ? "var(--a3)" : "var(--paper)" }}>
            {saved
              ? `Guardado. Sumaste ${coins} monedas y ${xp} XP.`
              : "Todavía sin guardar. Puedes cambiar lo que quieras hasta que pulses el botón."}
          </div>
          {saved && (
            <button type="button" onClick={() => router.push(`/retos/${challenge.id}`)} className="text-sm font-bold text-muted underline">
              Volver al tablero del reto
            </button>
          )}
        </aside>
      </section>
    </>
  );
}

function RewardRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 font-bold ${last ? "" : "border-b-[3px] border-dashed border-ink pb-2"}`}>
      <span className="font-num">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
