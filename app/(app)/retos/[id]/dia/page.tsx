"use client";

import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
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
    return <p className="text-sm text-muted">Cargando día…</p>;
  }

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <Link href={`/retos/${challenge.id}`} className="label-xs mb-4.5 inline-block text-muted transition-colors hover:text-ink">
            ← {challenge.name}
          </Link>
          <span className="label-xs mb-3.5 block">Reto · {challenge.name}</span>
          <h1 className="m-0 text-[48px] font-light leading-[0.95] tracking-tight sm:text-[64px]">Día {dayNumber}.</h1>
        </div>
        <div className="flex items-center gap-3.5">
          {dayNumber > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/retos/${challenge.id}/dia?day=${dayNumber - 1}`}>← Día {dayNumber - 1}</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              ← Día {dayNumber - 1}
            </Button>
          )}
          <span className="font-num text-[12px] text-muted">{formatShortDateEs(new Date(`${dayDateKey}T00:00:00`)).toUpperCase()}</span>
          {dayNumber < todayDayNumber ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/retos/${challenge.id}/dia?day=${dayNumber + 1}`}>Día {dayNumber + 1} →</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Día {dayNumber + 1} →
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-0">
        <div className="flex min-w-0 flex-col gap-9 lg:border-r lg:border-line lg:pr-14">
          <div>
            <div className="label-xs flex items-center justify-between">
              <span>Tiempo de hoy</span>
              <span className="text-ink">{min} / {goal} min</span>
            </div>
            <div className="my-4 flex gap-1">
              {Array.from({ length: tickCount }, (_, i) => (
                <span key={i} className="h-5.5 flex-1 rounded-sm" style={{ background: i < min ? (reached ? "var(--signal)" : "var(--ink)") : "var(--line)" }} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <Stepper label="Restar 5 minutos" onClick={() => { setMin((m) => Math.max(0, m - 5)); setSaved(false); }}>
                −
              </Stepper>
              <Stepper label="Sumar 5 minutos" onClick={() => { setMin((m) => m + 5); setSaved(false); }}>
                +
              </Stepper>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((v) => (
                  <Chip key={v} pressed={min === v} onClick={() => { setMin(v); setSaved(false); }}>
                    {v} min
                  </Chip>
                ))}
              </div>
              {isToday && timerMinutesAvailable > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setMin(timerMinutesAvailable); setSaved(false); }}>
                  Traer del Tomate ({formatMinutesLong(timerMinutesAvailable)})
                </Button>
              )}
            </div>
            <p className="font-num mt-4 text-[13px]" style={{ color: reached ? "var(--ink)" : "var(--muted)" }}>
              {reached ? "✓ Meta del día cumplida. Hoy ya cuenta para tu racha." : `Te faltan ${goal - min} min para cumplir la meta de ${goal} min.`}
            </p>
          </div>

          <div>
            <span className="label-xs mb-3 block">¿Qué aprendí hoy?</span>
            <textarea
              rows={5}
              value={note}
              onChange={(e) => { setNote(e.target.value); setSaved(false); }}
              placeholder="Escribe lo que descubriste, lo que te costó y qué probarás mañana…"
              className="box-border w-full resize-y rounded-card border border-line bg-transparent px-4 py-3.5 text-[16px] leading-snug text-ink placeholder:text-muted focus:border-signal focus:outline-none"
            />
            <div className="font-num mt-1.5 text-right text-xs text-muted">{note.length} caracteres</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="label-xs mr-1">Etiquetas</span>
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  pressed={tags.includes(t)}
                  onClick={() => { setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])); setSaved(false); }}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-10">
            <div className="flex flex-col gap-3">
              <span className="label-xs">¿Cómo te fue?</span>
              <div className="flex items-center gap-3.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <RatingDot key={n} active={mood !== null && n <= mood} label={MOOD_LABELS[n]} onClick={() => { setMood(n); setSaved(false); }} />
                ))}
              </div>
              <span className="font-num text-[12px] text-muted">{mood ? MOOD_LABELS[mood] : "Sin elegir"}</span>
            </div>
            <div className="flex flex-col gap-3">
              <span className="label-xs">Dificultad</span>
              <div className="flex items-center gap-3.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <RatingDot key={n} active={difficulty !== null && n <= difficulty} label={`Dificultad ${n}`} onClick={() => { setDifficulty(n); setSaved(false); }} />
                ))}
              </div>
              <span className="font-num text-[12px] text-muted">{difficulty ? DIFF_LABELS[difficulty] : "1 = fácil · 5 = muy difícil"}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 pt-9 lg:pt-0 lg:pl-14">
          <div className="flex items-center justify-between">
            <span className="label-xs">Fotos del día</span>
            <span className="label-xs text-ink">
              {photos.length} / {MAX_PHOTOS_PER_DAY}
            </span>
          </div>
          <div className="mt-4.5 grid grid-cols-2 gap-3.5">
            {photos.map((url) => (
              <div key={url} className="relative">
                {/* Firebase Storage download URLs aren't in next.config's image domains, and these
                    are small user-uploaded thumbnails in a scrolling grid, not an LCP candidate. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Foto del día" className="h-[130px] w-full rounded-card border border-line object-cover" />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => handleRemovePhoto(url)}
                  className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-line bg-paper text-ink"
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
                className="hov flex h-[130px] flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-border text-[13px] text-muted"
              >
                <span className="text-[28px] leading-none">+</span>
                {uploading ? "Subiendo…" : "Añadir"}
              </button>
            )}
          </div>
          <p className="mt-3.5 text-[13px] text-muted">Arrastra imágenes aquí. Se guardan con la fecha del día.</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

          <div className="label-xs mb-1 mt-8">Resumen del día</div>
          <Fact k="Tiempo" v={`${min} min${reached ? " · objetivo cumplido" : ` · faltan ${Math.max(0, goal - min)}`}`} highlight={reached} />
          <Fact k="Etiquetas" v={`${tags.length} ${tags.length === 1 ? "etiqueta" : "etiquetas"}`} />
          <Fact k="Recompensa" v={`+${coins} monedas · +${xp} XP`} />
          <Fact k="Fotos y nota" v={`${photos.length} foto(s) + ${note.length > 0 ? "nota" : "sin nota"}`} last />

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving} size="default">
              {saving ? "Guardando…" : saved ? "¡Día guardado!" : `Guardar día ${dayNumber}`}
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href={`/retos/${challenge.id}`}>Cancelar</Link>
            </Button>
          </div>
          {saved && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-num m-0 text-[13px] text-muted">Sumaste {coins} monedas y {xp} XP. Sigues aprendiendo {skill?.name ?? ""}.</p>
              <button type="button" onClick={() => router.push(`/retos/${challenge.id}`)} className="label-xs shrink-0 text-ink underline underline-offset-2">
                Volver al tablero →
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

const DIFF_LABELS = ["", "Muy fácil", "Fácil", "Justa", "Difícil", "Muy difícil"];

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-[20px] leading-none transition-colors hover:border-border-hover hover:bg-card"
    >
      {children}
    </button>
  );
}

function RatingDot({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className="size-8.5 rounded-full border transition-colors"
      style={{ background: active ? "var(--ink)" : "transparent", borderColor: active ? "var(--ink)" : "var(--border)" }}
    />
  );
}

function Fact({ k, v, last, highlight }: { k: string; v: string; last?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-4 ${last ? "" : "border-b border-line"}`}>
      <span className="label-xs">{k}</span>
      <span className="font-num text-[15px]" style={{ color: highlight ? "var(--signal)" : "var(--ink)" }}>
        {v}
      </span>
    </div>
  );
}
