"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, dateForDayNumber, totalInvestedMin } from "@/lib/challenge";
import { DAY_STATE_LABEL, DAY_STATE_STYLE } from "@/lib/challenge-ui";
import { dateKeyInTz } from "@/lib/tz";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

export default function RetoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { skills } = useAppData();
  const timezone = profile?.timezone ?? "America/Santo_Domingo";
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    return watchChallenge(id, setChallenge);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return watchChallengeDays(id, setDays);
  }, [id]);

  const todayKey = dateKeyInTz(new Date(), timezone);
  const startKey = challenge ? dateKeyInTz(new Date(challenge.startedAt), timezone) : todayKey;
  const currentDayNumber = useMemo(() => {
    if (!challenge) return 1;
    const elapsed = Math.floor((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`)) / 86_400_000) + 1;
    return Math.min(challenge.totalDays, Math.max(1, elapsed));
  }, [challenge, todayKey, startKey]);

  const { states } = useMemo(() => {
    if (!challenge) return { states: [] as ReturnType<typeof computeDayStates>["states"] };
    return computeDayStates(
      challenge.totalDays,
      currentDayNumber,
      days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin })),
      challenge.graceDaysAllowed,
    );
  }, [challenge, currentDayNumber, days]);

  const streak = useMemo(() => computeChallengeStreak(states), [states]);
  const investedMin = useMemo(() => totalInvestedMin(days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin }))), [days]);

  if (!challenge) {
    return <p className="text-sm text-muted">Cargando reto…</p>;
  }

  const skill = skills.find((s) => s.id === challenge.skillId);
  const endDate = dateForDayNumber(startKey, challenge.totalDays);
  const daysLeft = Math.max(0, challenge.totalDays - currentDayNumber);
  const sel = selectedDay ?? currentDayNumber;
  const selState = states[sel - 1];
  const selDay = days.find((d) => d.dayNumber === sel) ?? null;
  const selDateKey = dateForDayNumber(startKey, sel);

  const half = Math.ceil(challenge.totalDays / 2);
  const milestones = [
    challenge.totalDays >= 7 ? { label: "Día 7 · una semana", done: currentDayNumber >= 7 || challenge.totalDays < 7, day: 7 } : null,
    half !== 7 && half < challenge.totalDays ? { label: `Día ${half} · la mitad`, done: currentDayNumber >= half, day: half } : null,
    { label: `Día ${challenge.totalDays} · reto completo`, done: challenge.status === "completed", day: challenge.totalDays },
  ].filter((m): m is { label: string; done: boolean; day: number } => m !== null);

  const recent = days
    .filter((d) => d.durationMin > 0 || d.note)
    .slice()
    .sort((a, b) => b.dayNumber - a.dayNumber)
    .slice(0, 6);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-8 border-b border-line pb-8">
        <div>
          <Link href="/retos" className="label-xs mb-4.5 inline-block text-muted transition-colors hover:text-ink">
            ← Retos
          </Link>
          <span className="label-xs mb-3.5 block">
            Reto · {skill?.name ?? "Habilidad"} {challenge.status === "paused" ? "· pausado" : ""}
          </span>
          <h1 className="m-0 text-[42px] font-light leading-[0.95] tracking-tight sm:text-[56px]">{challenge.name}</h1>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" size="default">
            <Link href={`/retos/${challenge.id}/dia`}>Diario de hoy</Link>
          </Button>
          <Button asChild size="default">
            <Link href="/temporizador">Practicar ahora</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-0">
        <div className="min-w-0 lg:border-r lg:border-line lg:pr-14">
          <div className="flex flex-wrap items-baseline gap-4.5">
            <span className="text-[110px] font-light leading-[0.9] tracking-tight sm:text-[150px]">{Math.min(currentDayNumber, challenge.totalDays)}</span>
            <span className="font-num text-[16px] text-muted sm:text-[18px]">
              / {challenge.totalDays} DÍAS · {challenge.status === "completed" ? "COMPLETADO" : `QUEDAN ${daysLeft}`}
            </span>
          </div>

          <div role="list" aria-label="Días del reto" className="mt-9 grid grid-cols-7 gap-3 sm:grid-cols-10">
            {states.map((s, i) => {
              const dayNum = i + 1;
              const st = DAY_STATE_STYLE[s];
              return (
                <button
                  key={dayNum}
                  type="button"
                  role="listitem"
                  aria-current={sel === dayNum ? "true" : undefined}
                  onClick={() => setSelectedDay(dayNum)}
                  aria-label={`Día ${dayNum}, ${DAY_STATE_LABEL[s]}`}
                  className="font-num flex aspect-square min-h-11 items-center justify-center rounded-full border text-[13px] transition-transform"
                  style={{
                    background: st.bg,
                    borderColor: sel === dayNum ? "var(--ink)" : st.border,
                    color: st.fg,
                    boxShadow: s === "today" ? "0 0 0 4px color-mix(in srgb, var(--signal) 25%, transparent)" : "none",
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div aria-label="Leyenda" className="label-xs mt-5.5 flex flex-wrap gap-5">
            {(["done", "today", "grace", "missed", "upcoming"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: DAY_STATE_STYLE[s].dot }} />
                {DAY_STATE_LABEL[s]}
              </span>
            ))}
          </div>

          <div aria-live="polite" className="mt-9 rounded-card border border-line p-6.5">
            <span className="label-xs">
              Día {sel} · {formatShortDateEs(new Date(`${selDateKey}T00:00:00`))}
              {sel === currentDayNumber ? " · hoy" : ""}
            </span>
            <h3 className="m-0 mt-2 text-[22px] font-normal tracking-tight">
              {selState === "upcoming"
                ? "Todavía no llega"
                : selState === "today"
                  ? "Te falta practicar"
                  : selState === "grace"
                    ? "Día de gracia usado"
                    : selDay
                      ? `${formatMinutesLong(selDay.durationMin)} de práctica`
                      : "Sin registro"}
            </h3>
            <p className="m-0 mt-2 text-[16px] text-muted">
              {selState === "upcoming"
                ? "Se abre ese día. Mientras tanto, tu yo de hoy tiene trabajo por hacer."
                : selState === "today"
                  ? "Aún no hay tiempo ni nota. Practica y cuéntate qué aprendiste."
                  : selState === "grace"
                    ? `No practicaste, pero tu racha sigue viva. Te quedan ${Math.max(0, challenge.graceDaysAllowed - challenge.graceDaysUsed)} días de gracia.`
                    : (selDay?.note ?? "")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <span className="font-num text-[13px]">{selDay ? formatMinutesLong(selDay.durationMin) : `Meta ${challenge.dailyGoalMin} min`}</span>
              {selDay?.mood != null && <span className="font-num text-[13px] text-muted">{MOOD_LABELS[selDay.mood]}</span>}
              {selDay && selDay.photoUrls.length > 0 && (
                <span className="font-num text-[13px] text-muted">
                  {selDay.photoUrls.length} {selDay.photoUrls.length === 1 ? "foto" : "fotos"}
                </span>
              )}
              <Link
                href={sel === currentDayNumber ? `/retos/${challenge.id}/dia` : `/retos/${challenge.id}/dia?day=${sel}`}
                className="label-xs ml-auto text-ink underline underline-offset-2"
              >
                {selState === "today" ? "Escribir diario de hoy" : selDay ? `Abrir el día ${sel}` : "Añadir nota igual"} →
              </Link>
            </div>
          </div>
        </div>

        <div className="min-w-0 pt-9 lg:pt-0 lg:pl-14">
          <Fact k="Racha actual" v={`${streak.current} días`} />
          <Fact k="Récord del reto" v={`${streak.best} días`} />
          <Fact k="Tiempo invertido" v={formatMinutesLong(investedMin)} />
          <Fact k="Días de gracia" v={`${challenge.graceDaysUsed} / ${challenge.graceDaysAllowed}`} />
          <Fact k="Termina" v={formatShortDateEs(new Date(`${endDate}T00:00:00`))} last />

          <div className="label-xs mb-1 mt-9">Hitos del reto</div>
          {milestones.map((m) => (
            <div key={m.day} className="flex items-center gap-3.5 border-t border-line py-4">
              <span className="size-3.5 shrink-0 rounded-full" style={{ background: m.done ? "var(--ink)" : "var(--line)" }} />
              <span className="flex-1 text-[15px]" style={{ color: m.done ? "var(--ink)" : "var(--muted)" }}>
                {m.label}
              </span>
              <span className="font-num text-[11px]" style={{ color: m.done ? "var(--ink)" : "var(--muted)" }}>
                {m.done ? "logrado" : m.day > currentDayNumber ? `en ${m.day - currentDayNumber} días` : "pendiente"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-8">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <span className="label-xs">Últimas notas</span>
          <Link href={`/retos/${challenge.id}/galeria`} className="label-xs text-muted underline underline-offset-2 transition-colors hover:text-ink">
            Ver galería y diario →
          </Link>
        </div>
        {recent.length === 0 && <p className="py-6 text-sm text-muted">Todavía no has escrito ningún día.</p>}
        {recent.map((d) => (
          <Link key={d.id} href={`/retos/${challenge.id}/dia?day=${d.dayNumber}`} className="flex flex-wrap items-start gap-5 border-b border-line py-5">
            <span className="font-num shrink-0 text-[22px] leading-none tracking-tight">D{d.dayNumber}</span>
            <span className="font-num w-[110px] shrink-0 text-[13px] leading-snug text-muted">
              {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
              <br />
              {formatMinutesLong(d.durationMin)}
            </span>
            <span className="min-w-0 flex-1 text-[16px] text-ink/85">{d.note || "Sin nota."}</span>
          </Link>
        ))}
      </section>
    </>
  );
}

const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];

function Fact({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-4 ${last ? "" : "border-b border-line"}`}>
      <span className="label-xs">{k}</span>
      <span className="font-num text-[16px]">{v}</span>
    </div>
  );
}
