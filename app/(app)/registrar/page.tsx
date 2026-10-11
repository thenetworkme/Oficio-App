"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal, formatMinutesLong } from "@/lib/format";
import { QUICK_DURATIONS, clampMinutes, decrementMinutes, incrementMinutes } from "@/lib/manual-log";

export default function RegistrarPage() {
  const router = useRouter();
  const { user, skills, todayMinutes } = useAppData();
  const { celebration, enqueueCelebration, closeCelebration } = useCelebration();

  const [skillId, setSkillId] = useState<string | null>(skills[0]?.id ?? null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("19:00");
  const [minutes, setMinutes] = useState(90);
  const [quality, setQuality] = useState(4);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const skill = skills.find((s) => s.id === (skillId ?? skills[0]?.id)) ?? skills[0];
  const todayGoalMin = skills.reduce((acc, s) => acc + s.dailyGoalMin, 0) || 180;

  const newTotalHours = skill ? (skill.totalMinutes + minutes) / 60 : 0;
  const oldTotalHours = skill ? skill.totalMinutes / 60 : 0;
  const projectedToday = todayMinutes + minutes;
  const todayPct = Math.min(100, (projectedToday / todayGoalMin) * 100);
  const todayLeft = todayGoalMin - projectedToday;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !skill) return;
    setSaving(true);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = time.split(":").map(Number);
      const startedAt = new Date(y, m - 1, d, hh, mm).getTime();
      const result = await saveSession({
        userId: user.uid,
        skillId: skill.id,
        startedAt,
        durationMin: minutes,
        quality,
        note: note || null,
        pomodoros: 0,
        source: "manual",
      });
      setSaved(true);
      if (result.milestonesCrossed.length > 0) {
        enqueueCelebration(result.milestonesCrossed, {
          skillName: skill.name,
          skillColor: resolveSkillColor(skill.color),
          startedAt: skill.createdAt,
        });
      } else {
        router.push(`/habilidades/${skill.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const quickOptions = useMemo(() => QUICK_DURATIONS, []);

  if (skills.length === 0) {
    return <Card className="p-8 text-center text-muted">Necesitas al menos una habilidad antes de registrar horas.</Card>;
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Registro manual</span>
        <h1 className="m-0 text-[40px] font-bold leading-[0.95] tracking-tight sm:text-5xl">Que ninguna hora se pierda.</h1>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <form onSubmit={handleSubmit} className="bx flex min-w-0 flex-[3_1_480px] flex-col gap-6.5 p-7">
          <div role="group" aria-label="Habilidad" className="flex flex-col gap-2.5">
            <span className="label-xs">Habilidad</span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Chip key={s.id} pressed={skill?.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setSkillId(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-date">Fecha</Label>
              <Input id="l-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-num" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-time">Hora de inicio</Label>
              <Input id="l-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-num" />
            </div>
          </div>

          <div role="group" aria-label="Duración" className="flex flex-col gap-3">
            <span className="label-xs">Duración</span>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                aria-label="Restar 15 minutos"
                onClick={() => setMinutes((m) => decrementMinutes(m))}
                className="bx press flex size-12 items-center justify-center bg-card text-2xl font-bold leading-none"
              >
                −
              </button>
              <span role="status" className="font-num min-w-[190px] text-center text-[40px] font-bold tracking-tight sm:text-[48px]">
                {formatMinutesLong(minutes)}
              </span>
              <button
                type="button"
                aria-label="Sumar 15 minutos"
                onClick={() => setMinutes((m) => incrementMinutes(m))}
                className="bx press flex size-12 items-center justify-center bg-card text-2xl font-bold leading-none"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((v) => (
                <Chip key={v} pressed={minutes === v} onClick={() => setMinutes(clampMinutes(v))} className="font-num">
                  {formatMinutesLong(v)}
                </Chip>
              ))}
            </div>
          </div>

          <div role="group" aria-label="Calidad de la práctica" className="flex flex-col gap-2.5">
            <span className="label-xs">¿Qué tan enfocado estuviste?</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={quality === n}
                  aria-label={`Calidad ${n} de 5`}
                  onClick={() => setQuality(n)}
                  className="bx press font-num flex size-11 items-center justify-center text-[15px] font-bold"
                  style={quality === n ? { background: "var(--a1)" } : { background: "var(--card)" }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-note">Nota (opcional)</Label>
            <Input id="l-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué practicaste y qué te costó" />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => router.push("/")} className="bx press min-h-13 bg-card px-5 font-bold">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !skill} className="bx press min-h-13 px-6 font-bold disabled:opacity-60" style={{ background: "var(--a2)" }}>
              {saved ? "¡Sesión guardada!" : "Guardar sesión"}
            </button>
          </div>
        </form>

        <aside aria-label="Resumen" className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <Card className="flex flex-col gap-4.5 p-5.5" style={{ background: "var(--a1)" }}>
            <CardHeading>Esta sesión sumará</CardHeading>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="font-num text-[40px] font-bold">+{formatMinutesLong(minutes)}</span>
              <span>a {skill?.name}</span>
            </div>
            <div className="flex flex-col gap-1 border-t-2 border-dashed border-ink pt-4">
              <span className="label-xs">Total acumulado</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-num text-2xl font-bold">{formatDecimal(newTotalHours)} h</span>
                <span className="font-num text-sm">antes {formatDecimal(oldTotalHours)} h</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-5.5">
            <div className="flex items-baseline justify-between gap-3">
              <CardHeading className="text-lg">Hoy</CardHeading>
              <span className="font-num text-sm text-muted">
                {formatMinutesLong(projectedToday)} / {formatMinutesLong(todayGoalMin)}
              </span>
            </div>
            <ProgressBar pct={todayPct} color="var(--a1)" ariaLabel="Progreso de hoy" />
            <span className="text-sm text-muted">
              {todayLeft > 0 ? `Te faltan ${formatMinutesLong(todayLeft)} para tu meta diaria.` : "Meta diaria cumplida. La racha sigue en pie."}
            </span>
          </Card>
        </aside>
      </div>

      <CelebrationDialog
        open={celebration.open}
        onClose={() => {
          closeCelebration();
          if (skill) router.push(`/habilidades/${skill.id}`);
        }}
        skillName={celebration.skillName}
        skillColor={celebration.skillColor}
        hours={celebration.hours}
        achievedAt={celebration.achievedAt}
        startedAt={celebration.startedAt}
      />
    </>
  );
}
