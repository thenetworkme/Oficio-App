"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, dateForDayNumber, totalInvestedMin } from "@/lib/challenge";
import { DAY_STATE_COLOR, DAY_STATE_LABEL, DAY_STATE_MARK } from "@/lib/challenge-ui";
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
  const plannedMin = challenge.totalDays * challenge.dailyGoalMin;
  const endDate = dateForDayNumber(startKey, challenge.totalDays);
  const daysLeft = Math.max(0, challenge.totalDays - currentDayNumber);
  const pct = Math.round((currentDayNumber / challenge.totalDays) * 100);
  const sel = selectedDay ?? currentDayNumber;
  const selState = states[sel - 1];
  const selDay = days.find((d) => d.dayNumber === sel) ?? null;
  const selDateKey = dateForDayNumber(startKey, sel);

  const recent = days
    .filter((d) => d.durationMin > 0)
    .slice()
    .sort((a, b) => b.dayNumber - a.dayNumber)
    .slice(0, 6);

  return (
    <>
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2.5">
        <Link href="/retos" className="bx press flex min-h-11 items-center px-4 font-bold">
          ← Retos
        </Link>
        <span className="label-xs">{challenge.status === "active" ? "Reto activo" : challenge.status === "paused" ? "Reto pausado" : "Reto"}</span>
      </nav>

      <section className="flex flex-wrap items-stretch gap-8">
        <div className="bx flex min-w-0 flex-[2_1_560px] flex-col gap-4 p-7.5 text-ink-solid" style={{ background: challenge.color, transform: "rotate(-0.6deg)" }}>
          <span className="label-xs !text-ink-solid opacity-80">
            Reto · {skill?.name ?? "Habilidad"}
          </span>
          <h1 className="m-0 text-[42px] font-bold leading-[0.95] tracking-tight sm:text-[56px]">{challenge.name}</h1>
          {challenge.why && (
            <p className="m-0 max-w-[560px] text-lg font-medium">
              <b>Mi porqué:</b> {challenge.why}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-end gap-4">
            <div className="font-num text-[64px] font-bold leading-[0.9] sm:text-[76px]">Día {Math.min(currentDayNumber, challenge.totalDays)}</div>
            <span className="font-num pb-2 font-bold">
              de {challenge.totalDays} · {pct}% del camino
            </span>
          </div>
          <ProgressBar pct={pct} color="var(--a2)" ariaLabel="Avance del reto" height={26} />
        </div>
        <div className="grid min-w-0 flex-1 basis-[320px] grid-cols-2 gap-5">
          <Tile label="Racha" value={`${streak.current} días`} sub="Récord del reto" bg="var(--a2)" />
          <Tile label="Invertido" value={formatMinutesLong(investedMin)} sub={`de ${formatMinutesLong(plannedMin)} previstas`} bg="#7CC4FF" />
          <Tile label="Días de gracia" value={`${challenge.graceDaysUsed} / ${challenge.graceDaysAllowed}`} sub={`te quedan ${Math.max(0, challenge.graceDaysAllowed - challenge.graceDaysUsed)}`} bg="var(--paper)" />
          <Tile label="Termina" value={formatShortDateEs(new Date(`${endDate}T00:00:00`))} sub={`faltan ${daysLeft} días`} bg="var(--a3)" />
        </div>
      </section>

      <section className="flex flex-wrap gap-4">
        <Link href={`/retos/${challenge.id}/dia`} className="bx press flex min-h-16 items-center px-8 text-[20px] font-bold text-ink-solid" style={{ background: "var(--a3)" }}>
          Practicar hoy · {challenge.dailyGoalMin} min
        </Link>
        <Link href={`/retos/${challenge.id}/dia`} className="bx press flex min-h-16 items-center px-7 text-lg font-bold">
          Escribir el diario de hoy
        </Link>
        <Link href={`/retos/${challenge.id}/galeria`} className="bx press flex min-h-16 items-center px-7 text-lg font-bold">
          Galería
        </Link>
      </section>

      <section className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4.5">
          <h2 className="m-0 text-[32px] font-bold tracking-tight">Tu mes, día a día.</h2>
          <div role="list" aria-label="Días del reto" className="grid grid-cols-7 gap-2.5 sm:grid-cols-10">
            {states.map((s, i) => {
              const dayNum = i + 1;
              return (
                <button
                  key={dayNum}
                  type="button"
                  aria-pressed={sel === dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  aria-label={`Día ${dayNum}, ${DAY_STATE_LABEL[s]}`}
                  className="flex aspect-square min-h-12 flex-col items-center justify-center gap-0 rounded-button border-[3px] border-ink font-bold"
                  style={{
                    background: DAY_STATE_COLOR[s],
                    boxShadow: sel === dayNum ? "5px 5px 0 var(--shadow)" : "none",
                    color: s === "upcoming" ? "var(--muted)" : "var(--ink-solid)",
                  }}
                >
                  <span className="font-num text-base leading-none">{dayNum}</span>
                  <span className="text-[11px] leading-none">{DAY_STATE_MARK[s]}</span>
                </button>
              );
            })}
          </div>
          <div aria-label="Leyenda" className="flex flex-wrap gap-4">
            {(["done", "today", "grace", "missed", "upcoming"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-2 text-sm font-medium">
                <span className="size-5 rounded border-2 border-ink" style={{ background: DAY_STATE_COLOR[s] }} />
                {DAY_STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        <aside aria-live="polite" className="bx flex min-h-[250px] min-w-0 flex-[1_1_320px] flex-col gap-2.5 p-6.5">
          <span className="label-xs">
            Día {sel} · {formatShortDateEs(new Date(`${selDateKey}T00:00:00`))}
            {sel === currentDayNumber ? " · hoy" : ""}
          </span>
          <h3 className="m-0 text-2xl font-bold tracking-tight">
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
          <p className="m-0 text-[17px] font-medium">
            {selState === "upcoming"
              ? "Se abre ese día. Mientras tanto, tu yo de hoy tiene trabajo por hacer."
              : selState === "today"
                ? "Aún no hay tiempo ni nota. Practica y cuéntate qué aprendiste."
                : selState === "grace"
                  ? `No practicaste, pero tu racha sigue viva. Te quedan ${Math.max(0, challenge.graceDaysAllowed - challenge.graceDaysUsed)} días de gracia.`
                  : (selDay?.note ?? "")}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="min-h-8.5 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold">
              {selDay ? formatMinutesLong(selDay.durationMin) : `Meta ${challenge.dailyGoalMin} min`}
            </span>
            {selDay?.mood != null && (
              <span className="min-h-8.5 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold">
                {MOOD_LABELS[selDay.mood]}
              </span>
            )}
            {selDay && selDay.photoUrls.length > 0 && (
              <span className="min-h-8.5 inline-flex items-center rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold">
                {selDay.photoUrls.length} {selDay.photoUrls.length === 1 ? "foto" : "fotos"}
              </span>
            )}
          </div>
          <Link
            href={sel === currentDayNumber ? `/retos/${challenge.id}/dia` : `/retos/${challenge.id}/dia?day=${sel}`}
            className="bx press mt-auto flex min-h-11.5 items-center px-5 text-base font-bold text-ink-solid"
            style={{ background: "var(--a1)" }}
          >
            {selState === "today" ? "Escribir diario de hoy" : selDay ? `Abrir el día ${sel}` : "Añadir nota igual"}
          </Link>
        </aside>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="m-0 text-[32px] font-bold tracking-tight">Diario reciente.</h2>
        {recent.length === 0 && <p className="text-sm text-muted">Todavía no has escrito ningún día.</p>}
        {recent.map((d) => (
          <article key={d.id} className="bx flex flex-wrap items-center gap-5.5 p-5">
            <div
              className="font-num flex size-18.5 shrink-0 items-center justify-center rounded-button border-[3px] border-ink text-[30px] font-bold text-ink-solid"
              style={{ background: challenge.color }}
            >
              {d.dayNumber}
            </div>
            <div className="min-w-0 flex-1 basis-[360px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="label-xs">
                  Día {d.dayNumber} · {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
                </span>
                <span className="font-num text-xs text-muted">
                  {formatMinutesLong(d.durationMin)} · {d.mood != null ? MOOD_LABELS[d.mood] : "Sin ánimo"}
                </span>
              </div>
              <p className="m-0 mt-1 text-[17px] font-medium">{d.note}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];

function Tile({ label, value, sub, bg }: { label: string; value: string; sub: string; bg: string }) {
  return (
    <div className="bx flex flex-col gap-0.5 p-4.5 text-ink-solid" style={{ background: bg }}>
      <span className="label-xs !text-ink-solid text-[12px] opacity-80">{label}</span>
      <span className="font-num text-[30px] font-bold leading-[1.05]">{value}</span>
      <span className="font-num text-[12px]">{sub}</span>
    </div>
  );
}
