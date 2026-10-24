"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Wordmark } from "@/components/layout/TopNav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createSkill } from "@/lib/firestore/skills";
import { useSound } from "@/lib/sound/SoundProvider";
import { formatDecimal, formatInt, formatMinutesLong } from "@/lib/format";
import { hoursPerWeek, projectTimeRemaining, formatProjection } from "@/lib/projection";
import { createReminder } from "@/lib/firestore/reminders";

// Punto redesign note: this picker's 3 options used to map to the old
// Pegatina a1/a2/a3 triple-accent system (3 visually distinct colors). The
// Phase-1 token remap collapses --a1/--a2/--a3 to all equal --signal (see
// app/globals.css's big comment), so skill color can no longer be a 3-way
// accent choice here without also touching lib/skill-color.ts's
// resolveSkillColor (shared with dashboard/other not-yet-redesigned screens
// outside this phase's scope). Keeping the 3 stored ids (unchanged Firestore
// shape) but presenting them as one disabled-look swatch would be confusing,
// so this picker is temporarily reduced to confirming the skill's single
// signal-colored dot — a known, called-out regression until skill color
// gets its own proper multi-hue treatment in a later phase. "Pomodoro" pass:
// still true (still out of this phase's scope — lib/skill-color.ts is
// business logic, not touched), just restyled to sit in the reference's
// 5-swatch-row slot as a single swatch button instead of a plain dot.
const COLOR_OPTIONS = [{ id: "accent", name: "Acento", hex: "var(--signal)" }];
const GOAL_OPTIONS = [1000, 5000, 10000];
const DAILY_OPTIONS = [30, 60, 90, 120, 180, 240];
const DAY_OPTIONS = [3, 4, 5, 6, 7];

const STEP_LABELS = ["Habilidad", "Ritmo", "Aviso", "Listo"];
const STEP_TITLES = ["¿Qué quieres dominar?", "¿Cuánto tiempo le vas a dar?", "¿Cuándo te aviso?", "Todo listo"];

export default function NewSkillPage() {
  const router = useRouter();
  const { user } = useAuth();
  const sound = useSound();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [colorId] = useState("accent");
  const [goal, setGoal] = useState(10000);
  const [initial, setInitial] = useState("0");
  const [daily, setDaily] = useState(120);
  const [days, setDays] = useState(6);
  const [remind, setRemind] = useState(true);
  const [remindTime, setRemindTime] = useState("07:00");
  const [creating, setCreating] = useState(false);

  const displayName = name.trim() === "" ? "Nueva habilidad" : name;
  const colorHex = COLOR_OPTIONS.find((c) => c.id === colorId)?.hex ?? "var(--signal)";
  const perWeek = hoursPerWeek(daily, days);
  const initNum = Math.max(0, parseFloat(initial) || 0);

  function etaFor(target: number) {
    return formatProjection(projectTimeRemaining(Math.max(0, target - initNum), perWeek));
  }

  const marks = [100, 1000, 5000, 10000].filter((h) => h <= goal);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const skillId = await createSkill({
        userId: user.uid,
        name: displayName,
        color: colorId,
        goalHours: goal,
        initialHours: initNum,
        dailyGoalMin: daily,
        daysPerWeek: days,
      });
      if (remind) {
        await createReminder({
          userId: user.uid,
          skillId,
          kind: "practice",
          timeOfDay: remindTime,
          days: [1, 2, 3, 4, 5, 6, 7],
          message: `Hora de practicar ${displayName}`,
          enabled: true,
        });
      }
      sound.playSuccess();
      router.push(`/habilidades/${skillId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--mode-bg)" }}>
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 sm:px-10">
        <Wordmark className="text-mode-ink" />
        <Link
          href="/"
          className="label-xs inline-flex min-h-9 items-center rounded-[4px] border border-card-tint-border bg-card-tint px-3 text-mode-ink transition-colors hover:bg-white/30"
        >
          Cancelar y volver al panel
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-6 sm:px-10">
        <ol aria-label="Pasos" className="m-0 grid list-none grid-cols-4 gap-3 p-0">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex flex-col gap-2">
              <div className="h-1.5 rounded-chip" style={{ background: i + 1 <= step ? "var(--mode-ink)" : "rgba(255,255,255,.25)" }} />
              <span className="text-[13px]" style={{ color: i + 1 === step ? "var(--mode-ink)" : "var(--mode-ink-muted)", fontWeight: i + 1 === step ? 600 : 400 }}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-start gap-5">
          <Card tone="solid" className="flex min-w-0 flex-[3_1_480px] flex-col gap-7 p-6 sm:p-7">
            <h1 className="m-0 text-[32px] font-bold leading-tight tracking-tight">{STEP_TITLES[step - 1]}</h1>

            {step === 1 && (
              <div className="flex flex-col gap-6.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="n-name" className="text-card-solid-muted">
                    Nombre de la habilidad
                  </Label>
                  <Input
                    id="n-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Piano, Dibujo, Ajedrez"
                    className="min-h-[52px] text-lg font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-card-solid-muted">Color</Label>
                  <div className="flex gap-2.5">
                    {COLOR_OPTIONS.map((c) => (
                      <span
                        key={c.id}
                        aria-hidden="true"
                        className="size-9 rounded-card"
                        style={{ background: c.hex, boxShadow: "0 0 0 3px var(--card-solid), 0 0 0 5px var(--flat-dark)" }}
                      />
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Meta de horas" className="flex flex-col gap-2.5">
                  <Label className="text-card-solid-muted">Meta de horas</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((g) => (
                      <Chip key={g} pressed={goal === g} onClick={() => setGoal(g)} className="font-num">
                        {formatInt(g)} h
                      </Chip>
                    ))}
                  </div>
                  <span className="text-[13px] text-card-solid-muted">
                    10.000 h es la cifra clásica de la maestría. Puedes elegir una meta más corta para empezar.
                  </span>
                </div>
                <div className="flex max-w-80 flex-col gap-1.5">
                  <Label htmlFor="n-init" className="text-card-solid-muted">
                    ¿Cuántas horas llevas ya? (opcional)
                  </Label>
                  <Input id="n-init" type="number" min={0} value={initial} onChange={(e) => setInitial(e.target.value)} className="font-num" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6.5">
                <div role="group" aria-label="Meta diaria" className="flex flex-col gap-2.5">
                  <Label className="text-card-solid-muted">Tiempo por día de práctica</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAILY_OPTIONS.map((m) => (
                      <Chip key={m} pressed={daily === m} onClick={() => setDaily(m)} className="font-num">
                        {formatMinutesLong(m)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Días por semana" className="flex flex-col gap-2.5">
                  <Label className="text-card-solid-muted">Días por semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <Chip key={d} pressed={days === d} onClick={() => setDays(d)} className="font-num w-11 justify-center px-0">
                        {d}
                      </Chip>
                    ))}
                  </div>
                  <span className="text-[13px] text-card-solid-muted">
                    Con este ritmo practicas {formatDecimal(perWeek)} h por semana. Elige algo que puedas sostener incluso en una mala semana.
                  </span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6.5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface-muted px-4.5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-surface-muted-ink">Recordarme todos los días</span>
                    <span className="text-[13px] text-surface-muted-ink opacity-80">Aviso push a la hora que elijas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      aria-label="Hora del recordatorio"
                      value={remindTime}
                      onChange={(e) => setRemindTime(e.target.value)}
                      className="font-num min-h-11 w-auto bg-card-solid text-card-solid-ink"
                    />
                    <Switch checked={remind} onCheckedChange={setRemind} label="Activar recordatorio diario" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-4">
                <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
                  <dt className="text-sm text-card-solid-muted">Habilidad</dt>
                  <dd className="m-0 font-bold">{displayName}</dd>
                  <dt className="text-sm text-card-solid-muted">Meta</dt>
                  <dd className="font-num m-0">
                    {formatInt(goal)} h{initNum > 0 ? ` (ya llevas ${formatDecimal(initNum)} h)` : ""}
                  </dd>
                  <dt className="text-sm text-card-solid-muted">Ritmo</dt>
                  <dd className="font-num m-0">
                    {formatMinutesLong(daily)} · {days} días por semana
                  </dd>
                  <dt className="text-sm text-card-solid-muted">Recordatorio</dt>
                  <dd className="font-num m-0">{remind ? `Todos los días a las ${remindTime}` : "Sin recordatorio"}</dd>
                </dl>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {step > 1 && (
                  <Button variant="light" onClick={() => setStep((s) => s - 1)}>
                    Atrás
                  </Button>
                )}
              </div>
              <div>
                {step < 4 && (
                  <Button variant="dark" onClick={() => setStep((s) => s + 1)}>
                    {step === 3 ? "Ver resumen" : "Siguiente"}
                  </Button>
                )}
                {step === 4 && (
                  <Button variant="dark" onClick={handleCreate} disabled={creating}>
                    {creating ? "Creando…" : "Crear habilidad"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card tone="solid" aria-label="Tu camino" className="flex min-w-0 flex-[2_1_320px] flex-col gap-5.5 p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="size-3.5 rounded-full" style={{ background: colorHex }} />
              <h2 className="m-0 text-xl font-medium">{displayName}</h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="label-xs text-card-solid-muted">A este ritmo llegas a la meta en</span>
              <span className="font-num text-[40px] font-extrabold leading-tight" style={{ color: colorHex }}>
                {etaFor(goal)}
              </span>
              <span className="text-[13px] text-card-solid-muted">
                {formatDecimal(perWeek)} h por semana · {formatInt(goal)} h de meta
              </span>
            </div>
            <div className="flex flex-col">
              {marks.map((h) => (
                <div key={h} className="flex items-baseline justify-between gap-3 border-t border-card-solid-line py-3">
                  <span className="font-num text-[15px]">{formatInt(h)} h</span>
                  <span className="text-sm text-card-solid-muted">{etaFor(h)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
