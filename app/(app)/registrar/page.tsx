"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal, formatMinutesLong } from "@/lib/format";
import { QUICK_DURATIONS, clampMinutes, decrementMinutes, incrementMinutes } from "@/lib/manual-log";

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function RegistrarPage() {
  const router = useRouter();
  const { user, skills, todayMinutes } = useAppData();
  const { celebration, enqueueCelebration, closeCelebration } = useCelebration();

  const todayStr = useMemo(() => dateKey(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d);
  }, []);

  const [skillId, setSkillId] = useState<string | null>(skills[0]?.id ?? null);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState("19:00");
  const [minutes, setMinutes] = useState(90);
  const [quality, setQuality] = useState(4);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastDurationMin, setLastDurationMin] = useState(0);

  const skill = skills.find((s) => s.id === (skillId ?? skills[0]?.id)) ?? skills[0];
  const skillColor = skill ? resolveSkillColor(skill.color) : "var(--mode-bg)";
  const todayGoalMin = skills.reduce((acc, s) => acc + s.dailyGoalMin, 0) || 180;

  const newTotalHours = skill ? (skill.totalMinutes + minutes) / 60 : 0;
  const oldTotalHours = skill ? skill.totalMinutes / 60 : 0;
  const savedTotalHours = skill ? (skill.totalMinutes + lastDurationMin) / 60 : 0;
  const isToday = date === todayStr;
  const projectedToday = isToday ? todayMinutes + minutes : todayMinutes;
  const todayPct = Math.min(100, (projectedToday / todayGoalMin) * 100);
  const todayLeft = todayGoalMin - projectedToday;
  const dayPick = date === todayStr ? "hoy" : date === yesterdayStr ? "ayer" : "otro";

  function resetForm() {
    setSaved(false);
    setNote("");
  }

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
      setLastDurationMin(minutes);
      setSaved(true);
      if (result.milestonesCrossed.length > 0) {
        enqueueCelebration(result.milestonesCrossed, {
          skillName: skill.name,
          skillColor,
          startedAt: skill.createdAt,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const quickOptions = useMemo(() => QUICK_DURATIONS, []);

  if (skills.length === 0) {
    return (
      <>
        <ModeBackdrop />
        <Card tone="solid" className="p-8 text-center text-card-solid-muted">
          Necesitas al menos una habilidad antes de registrar horas.
        </Card>
      </>
    );
  }

  return (
    <>
      <ModeBackdrop />

      <header className="flex flex-col gap-2.5">
        <span className="label-xs text-mode-ink-muted">Registro manual</span>
        <h1 className="m-0 text-[44px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[56px]">Añadir horas</h1>
        <p className="m-0 text-mode-ink-muted">¿Practicaste fuera del temporizador? Anótalo aquí.</p>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        <Card tone="solid" className="flex min-w-0 flex-[3_1_480px] flex-col p-6 sm:p-7">
          {saved ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-flat-dark text-flat-dark-ink">
                <Check size={26} aria-hidden="true" />
              </span>
              <h2 className="m-0 text-[22px] font-bold">Horas guardadas</h2>
              <p className="m-0 max-w-xs text-card-solid-muted">
                Sumaste <strong className="font-semibold">{formatMinutesLong(lastDurationMin)}</strong> a {skill?.name}. Ya llevas{" "}
                <strong style={{ color: skillColor }}>{formatDecimal(savedTotalHours)} h</strong>.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2.5">
                <Button variant="light" onClick={resetForm}>
                  Registrar otra
                </Button>
                <Button variant="dark" onClick={() => skill && router.push(`/habilidades/${skill.id}`)}>
                  Ver habilidad
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6.5">
              <div role="group" aria-label="Habilidad" className="flex flex-col gap-2.5">
                <Label>Habilidad</Label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Chip key={s.id} pressed={skill?.id === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => setSkillId(s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label>Día</Label>
                <div className="flex flex-wrap gap-2">
                  <Chip pressed={dayPick === "hoy"} onClick={() => setDate(todayStr)}>
                    Hoy
                  </Chip>
                  <Chip pressed={dayPick === "ayer"} onClick={() => setDate(yesterdayStr)}>
                    Ayer
                  </Chip>
                  <Chip pressed={dayPick === "otro"} onClick={() => {}}>
                    Otro
                  </Chip>
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
                <Label>Duración</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    aria-label="Restar 15 minutos"
                    onClick={() => setMinutes((m) => decrementMinutes(m))}
                    className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-xl font-medium leading-none text-surface-muted-ink transition-colors hover:bg-surface-muted-hover"
                  >
                    −
                  </button>
                  <span role="status" className="font-mono min-w-[200px] text-center text-[40px] font-medium tracking-tight sm:text-[48px]">
                    {formatMinutesLong(minutes)}
                  </span>
                  <button
                    type="button"
                    aria-label="Sumar 15 minutos"
                    onClick={() => setMinutes((m) => incrementMinutes(m))}
                    className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-xl font-medium leading-none text-surface-muted-ink transition-colors hover:bg-surface-muted-hover"
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
                <Label>¿Qué tan enfocado estuviste?</Label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={quality === n}
                      aria-label={`Calidad ${n} de 5`}
                      onClick={() => setQuality(n)}
                      className={
                        "font-num flex size-11 items-center justify-center rounded-full text-[15px] font-medium transition-colors " +
                        (quality === n ? "bg-flat-dark text-flat-dark-ink" : "bg-surface-muted text-surface-muted-ink hover:bg-surface-muted-hover")
                      }
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
                <Button type="button" variant="light" onClick={() => router.push("/")}>
                  Cancelar
                </Button>
                <Button type="submit" variant="dark" disabled={saving || !skill}>
                  {saving ? "Guardando…" : "Guardar horas"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <aside aria-label="Resumen" className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          <Card tone="solid" className="flex flex-col gap-4 p-5.5">
            <CardHeading className="text-[16px] font-bold text-card-solid-muted">Esta sesión sumará</CardHeading>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="font-num text-[36px] font-extrabold leading-none" style={{ color: skillColor }}>
                +{formatMinutesLong(minutes)}
              </span>
              <span className="text-card-solid-muted">a {skill?.name}</span>
            </div>
            <div className="flex flex-col gap-1 border-t border-card-solid-line pt-4">
              <span className="label-xs text-card-solid-muted">Total acumulado</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-num text-2xl font-medium">{formatDecimal(newTotalHours)} h</span>
                <span className="font-num text-sm text-card-solid-muted">antes {formatDecimal(oldTotalHours)} h</span>
              </div>
            </div>
          </Card>

          <Card tone="solid" className="flex flex-col gap-3 p-5.5">
            <div className="flex items-baseline justify-between gap-3">
              <CardHeading className="text-[16px] font-bold text-card-solid-muted">Hoy</CardHeading>
              <span className="font-num text-sm text-card-solid-muted">
                {formatMinutesLong(projectedToday)} / {formatMinutesLong(todayGoalMin)}
              </span>
            </div>
            <ProgressBar pct={todayPct} color="var(--mode-bg)" trackColor="var(--card-solid-line)" ariaLabel="Progreso de hoy" />
            <span className="text-sm text-card-solid-muted">
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
