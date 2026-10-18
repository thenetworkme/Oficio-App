"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
// gets its own proper multi-hue treatment in a later phase.
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
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-6 sm:px-10">
        <Wordmark />
        <Link href="/" className="label-xs min-h-11 inline-flex items-center">
          Cancelar y volver al panel
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
        <ol aria-label="Pasos" className="m-0 grid list-none grid-cols-4 gap-3 p-0">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex flex-col gap-2">
              <div className="h-1.5 rounded-chip" style={{ background: i + 1 <= step ? colorHex : "var(--line)" }} />
              <span className="text-[13px]" style={{ color: i + 1 === step ? "var(--ink)" : "var(--muted)", fontWeight: i + 1 === step ? 600 : 400 }}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-7 rounded-card border border-line bg-card p-8">
            <h1 className="m-0 text-[36px] font-light leading-tight tracking-tight">{STEP_TITLES[step - 1]}</h1>

            {step === 1 && (
              <div className="flex flex-col gap-6.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="n-name">Nombre de la habilidad</Label>
                  <Input
                    id="n-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Piano, Dibujo, Ajedrez"
                    className="min-h-[52px] text-lg"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: colorHex }} aria-hidden="true" />
                  <span className="text-[13px] text-muted">Color de acento de la habilidad</span>
                </div>
                <div role="group" aria-label="Meta de horas" className="flex flex-col gap-2.5">
                  <span className="label-xs">Meta de horas</span>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={goal === g}
                        onClick={() => setGoal(g)}
                        className="font-num min-h-12 rounded-button border px-5 transition-colors"
                        style={{ borderColor: goal === g ? colorHex : "var(--border)", background: goal === g ? "var(--card)" : "transparent" }}
                      >
                        {formatInt(g)} h
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] text-muted">
                    10.000 h es la cifra clásica de la maestría. Puedes elegir una meta más corta para empezar.
                  </span>
                </div>
                <div className="flex max-w-80 flex-col gap-1.5">
                  <Label htmlFor="n-init">¿Cuántas horas llevas ya? (opcional)</Label>
                  <Input id="n-init" type="number" min={0} value={initial} onChange={(e) => setInitial(e.target.value)} className="font-num" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6.5">
                <div role="group" aria-label="Meta diaria" className="flex flex-col gap-2.5">
                  <span className="label-xs">Tiempo por día de práctica</span>
                  <div className="flex flex-wrap gap-2">
                    {DAILY_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={daily === m}
                        onClick={() => setDaily(m)}
                        className="font-num min-h-12 rounded-button border px-4.5 transition-colors"
                        style={{ borderColor: daily === m ? colorHex : "var(--border)", background: daily === m ? "var(--card)" : "transparent" }}
                      >
                        {formatMinutesLong(m)}
                      </button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Días por semana" className="flex flex-col gap-2.5">
                  <span className="label-xs">Días por semana</span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={days === d}
                        onClick={() => setDays(d)}
                        className="font-num flex size-13 items-center justify-center rounded-full border transition-colors"
                        style={{ borderColor: days === d ? colorHex : "var(--border)", background: days === d ? "var(--card)" : "transparent" }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] text-muted">
                    Con este ritmo practicas {formatDecimal(perWeek)} h por semana. Elige algo que puedas sostener incluso en una mala semana.
                  </span>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6.5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line px-4.5 py-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Recordarme todos los días</span>
                    <span className="text-[13px] text-muted">Aviso push a la hora que elijas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="time"
                      aria-label="Hora del recordatorio"
                      value={remindTime}
                      onChange={(e) => setRemindTime(e.target.value)}
                      className="font-num min-h-11 w-auto"
                    />
                    <Switch checked={remind} onCheckedChange={setRemind} label="Activar recordatorio diario" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-4">
                <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
                  <dt className="text-sm text-muted">Habilidad</dt>
                  <dd className="m-0 font-bold">{displayName}</dd>
                  <dt className="text-sm text-muted">Meta</dt>
                  <dd className="font-num m-0">
                    {formatInt(goal)} h{initNum > 0 ? ` (ya llevas ${formatDecimal(initNum)} h)` : ""}
                  </dd>
                  <dt className="text-sm text-muted">Ritmo</dt>
                  <dd className="font-num m-0">
                    {formatMinutesLong(daily)} · {days} días por semana
                  </dd>
                  <dt className="text-sm text-muted">Recordatorio</dt>
                  <dd className="font-num m-0">{remind ? `Todos los días a las ${remindTime}` : "Sin recordatorio"}</dd>
                </dl>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>{step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Atrás</Button>}</div>
              <div>
                {step < 4 && <Button onClick={() => setStep((s) => s + 1)}>{step === 3 ? "Ver resumen" : "Siguiente"}</Button>}
                {step === 4 && (
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creando…" : "Crear habilidad"}
                  </Button>
                )}
              </div>
            </div>
          </section>

          <aside aria-label="Tu camino" className="flex min-w-0 flex-[2_1_320px] flex-col gap-5.5 rounded-card border border-line bg-card p-7">
            <div className="flex items-center gap-3">
              <span className="size-3.5 rounded-full" style={{ background: colorHex }} />
              <h2 className="m-0 text-xl font-medium">{displayName}</h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="label-xs">A este ritmo llegas a la meta en</span>
              <span className="font-num text-[44px] font-light leading-tight" style={{ color: colorHex }}>
                {etaFor(goal)}
              </span>
              <span className="text-[13px] text-muted">
                {formatDecimal(perWeek)} h por semana · {formatInt(goal)} h de meta
              </span>
            </div>
            <div className="flex flex-col">
              {marks.map((h) => (
                <div key={h} className="flex items-baseline justify-between gap-3 border-t border-line py-3">
                  <span className="font-num text-[15px]">{formatInt(h)} h</span>
                  <span className="text-sm text-muted">{etaFor(h)}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
