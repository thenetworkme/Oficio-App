"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, dateForDayNumber, totalInvestedMin, type ChallengeDayState } from "@/lib/challenge";
import { dateKeyInTz } from "@/lib/tz";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4l13 8-13 8z" />
    </svg>
  );
}

function dayCellStyle(state: ChallengeDayState, selected: boolean): React.CSSProperties {
  const base: React.CSSProperties = { fontWeight: 700 };
  switch (state) {
    case "done":
      Object.assign(base, { background: "var(--mode-bg)", color: "#fff" });
      break;
    case "today":
      Object.assign(base, { background: "var(--card-solid)", color: "var(--mode-bg)", boxShadow: "inset 0 0 0 2.5px var(--mode-bg)" });
      break;
    case "missed":
      Object.assign(base, { background: "var(--surface-muted)", color: "var(--danger)" });
      break;
    default:
      Object.assign(base, { background: "var(--surface-muted)", color: "var(--surface-muted-ink)" });
  }
  if (selected) base.boxShadow = `${base.boxShadow ? base.boxShadow + "," : ""} 0 0 0 2px var(--card-solid), 0 0 0 4px var(--card-solid-ink)`;
  return base;
}

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
    return (
      <>
        <ModeBackdrop />
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="text-[15px] text-mode-ink-muted">Cargando reto…</span>
        </div>
      </>
    );
  }

  const skill = skills.find((s) => s.id === challenge.skillId);
  const endDateKey = dateForDayNumber(startKey, challenge.totalDays);
  const sel = selectedDay ?? currentDayNumber;
  const selState = states[sel - 1];
  const selDay = days.find((d) => d.dayNumber === sel) ?? null;
  const selDateKey = dateForDayNumber(startKey, sel);
  const pctConstancy = challenge.totalDays > 0 ? Math.round(((currentDayNumber - states.filter((s) => s === "missed").length) / currentDayNumber) * 100) : 0;

  const recent = days
    .filter((d) => d.durationMin > 0 || d.note)
    .slice()
    .sort((a, b) => b.dayNumber - a.dayNumber)
    .slice(0, 5);

  return (
    <>
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 text-mode-ink">
        <div>
          <Link href="/retos" className="mb-2 inline-flex items-center gap-1 text-[14px]" style={{ color: "var(--mode-ink-muted)" }}>
            <ChevronLeft />
            Retos
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-[13px] font-bold uppercase tracking-wide text-mode-ink-muted">{skill?.name ?? "Habilidad"}</span>
              <h1 className="m-0 mt-0.5 text-[30px] font-bold leading-[1.15] tracking-tight">{challenge.name}</h1>
              <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
                Empezó el {formatShortDateEs(new Date(`${startKey}T00:00:00`))} · termina el {formatShortDateEs(new Date(`${endDateKey}T00:00:00`))}
                {challenge.status === "paused" ? " · pausado" : ""}
              </p>
            </div>
            <div className="font-num shrink-0 text-right text-[40px] font-extrabold leading-none">
              {Math.min(currentDayNumber, challenge.totalDays)}
              <span className="text-[16px] font-normal" style={{ opacity: 0.7 }}>
                {" "}
                / {challenge.totalDays}
              </span>
            </div>
          </div>
        </div>

        <Card tone="solid" className="p-6">
          <div role="group" aria-label="Días del reto" className="grid grid-cols-7 gap-2 sm:grid-cols-10">
            {states.map((s, i) => {
              const dayNum = i + 1;
              return (
                <button
                  key={dayNum}
                  type="button"
                  aria-label={`Día ${dayNum}`}
                  aria-pressed={sel === dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className="font-num flex aspect-square items-center justify-center rounded-[8px] text-[13px] transition-transform"
                  style={dayCellStyle(s, sel === dayNum)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--card-solid-line)" }}>
            <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--card-solid-muted)" }}>
              Día {sel} · {formatShortDateEs(new Date(`${selDateKey}T00:00:00`))}
              {sel === currentDayNumber ? " · hoy" : ""}
            </div>
            <div className="mt-1 text-[18px] font-bold" style={{ color: "var(--card-solid-ink)" }}>
              {selState === "upcoming"
                ? "Todavía no llega"
                : selState === "today"
                  ? "Te falta practicar"
                  : selState === "grace"
                    ? "Día de gracia usado"
                    : selDay
                      ? `${formatMinutesLong(selDay.durationMin)} de práctica`
                      : "Sin registro"}
            </div>
            <p className="m-0 mt-1.5 text-[15px]" style={{ color: "var(--card-solid-muted)" }}>
              {selState === "upcoming"
                ? "Se abre ese día. Mientras tanto, tu yo de hoy tiene trabajo por hacer."
                : selState === "today"
                  ? "Aún no hay tiempo ni nota. Practica y cuéntate qué aprendiste."
                  : selState === "grace"
                    ? `No practicaste, pero tu racha sigue viva. Te quedan ${Math.max(0, challenge.graceDaysAllowed - challenge.graceDaysUsed)} días de gracia.`
                    : selDay?.note || "Sin nota."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
              {selDay?.mood != null && <span>{MOOD_LABELS[selDay.mood]}</span>}
              {selDay && selDay.photoUrls.length > 0 && (
                <span>
                  {selDay.photoUrls.length} {selDay.photoUrls.length === 1 ? "foto" : "fotos"}
                </span>
              )}
              <Link
                href={sel === currentDayNumber ? `/retos/${challenge.id}/dia` : `/retos/${challenge.id}/dia?day=${sel}`}
                className="ml-auto font-semibold underline underline-offset-2"
                style={{ color: "var(--mode-bg)" }}
              >
                {selState === "today" ? "Escribir diario de hoy" : selDay ? `Abrir el día ${sel}` : "Añadir nota igual"} →
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2.5">
          <Card tone="tint" className="p-4 text-center">
            <div className="font-num text-[24px] font-extrabold leading-none">{streak.current}</div>
            <div className="mt-1 text-[12px]" style={{ opacity: 0.85 }}>
              racha actual
            </div>
          </Card>
          <Card tone="tint" className="p-4 text-center">
            <div className="font-num text-[24px] font-extrabold leading-none">{formatMinutesLong(investedMin)}</div>
            <div className="mt-1 text-[12px]" style={{ opacity: 0.85 }}>
              practicadas
            </div>
          </Card>
          <Card tone="tint" className="p-4 text-center">
            <div className="font-num text-[24px] font-extrabold leading-none">{Math.max(0, Math.min(100, pctConstancy))}%</div>
            <div className="mt-1 text-[12px]" style={{ opacity: 0.85 }}>
              sin faltar
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="go" size="md" className="flex-1">
            <Link href="/temporizador">
              <PlayIcon /> Practicar
            </Link>
          </Button>
          <Button asChild variant="onColor" size="md">
            <Link href={`/retos/${challenge.id}/dia`}>Añadir nota</Link>
          </Button>
          <Button asChild variant="onColor" size="md">
            <Link href={`/retos/${challenge.id}/galeria`}>Galería</Link>
          </Button>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[14px] font-bold" style={{ opacity: 0.85 }}>
              Últimas notas
            </span>
            <Link href={`/retos/${challenge.id}/galeria`} className="text-[13px] underline underline-offset-2" style={{ color: "var(--mode-ink-muted)" }}>
              Ver galería y diario →
            </Link>
          </div>
          {recent.length === 0 && (
            <Card tone="tint" className="p-5 text-[14px]">
              Todavía no has escrito ningún día.
            </Card>
          )}
          {recent.length > 0 && (
            <Card tone="solid" className="p-0">
              {recent.map((d, i) => (
                <Link
                  key={d.id}
                  href={`/retos/${challenge.id}/dia?day=${d.dayNumber}`}
                  className="flex items-start gap-4 p-4"
                  style={i > 0 ? { borderTop: "1px solid var(--card-solid-line)" } : undefined}
                >
                  <span className="font-num shrink-0 text-[18px] font-extrabold" style={{ color: "var(--mode-bg)" }}>
                    D{d.dayNumber}
                  </span>
                  <span className="font-num w-[100px] shrink-0 text-[12px] leading-snug" style={{ color: "var(--card-solid-muted)" }}>
                    {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
                    <br />
                    {formatMinutesLong(d.durationMin)}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px]" style={{ color: "var(--card-solid-ink)" }}>
                    {d.note || "Sin nota."}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
