"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createSkill } from "@/lib/firestore/skills";
import { formatDecimal, formatInt, formatMinutesLong } from "@/lib/format";
import { hoursPerWeek, projectTimeRemaining, formatProjection } from "@/lib/projection";
import { createReminder } from "@/lib/firestore/reminders";

const COLOR_OPTIONS = [
  { id: "accent", name: "Acento", hex: "var(--accent)" },
  { id: "a2", name: "Secundario", hex: "var(--a2)" },
  { id: "a3", name: "Terciario", hex: "var(--a3)" },
];
const GOAL_OPTIONS = [1000, 5000, 10000];
const DAILY_OPTIONS = [30, 60, 90, 120, 180, 240];
const DAY_OPTIONS = [3, 4, 5, 6, 7];

const STEP_LABELS = ["Habilidad", "Ritmo", "Recordatorio"];
const STEP_TITLES = ["¿Qué quieres dominar?", "¿Cuánto tiempo le vas a dar?", "Que no se te olvide"];

export default function NewSkillPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState("a3");
  const [goal, setGoal] = useState(10000);
  const [initial, setInitial] = useState("0");
  const [daily, setDaily] = useState(120);
  const [days, setDays] = useState(6);
  const [remind, setRemind] = useState(true);
  const [remindTime, setRemindTime] = useState("07:00");
  const [creating, setCreating] = useState(false);

  const displayName = name.trim() === "" ? "Nueva habilidad" : name;
  const colorHex = COLOR_OPTIONS.find((c) => c.id === colorId)?.hex ?? "var(--accent)";
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
      router.push(`/habilidades/${skillId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="11" stroke="var(--line)" strokeWidth="3" />
            <path d="M14 3a11 11 0 0 1 9.5 5.5" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-2xl font-bold tracking-tight">Oficio</span>
        </div>
        <Link href="/" className="min-h-11 inline-flex items-center text-sm text-muted">
          Cancelar y volver al panel
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-6 py-10 sm:px-10">
        <ol aria-label="Pasos" className="m-0 grid list-none grid-cols-3 gap-3 p-0">
          {STEP_LABELS.map((label, i) => (
            <li key={label} className="flex flex-col gap-2">
              <div className="h-1.5 rounded-chip" style={{ background: i + 1 <= step ? colorHex : "var(--track)" }} />
              <span className="text-[13px]" style={{ color: i + 1 === step ? "var(--text)" : "var(--muted)", fontWeight: i + 1 === step ? 600 : 400 }}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-start gap-6">
          <section className="flex min-w-0 flex-[3_1_480px] flex-col gap-7 rounded-card border border-line bg-card p-8">
            <h1 className="m-0 text-[36px] font-bold leading-tight tracking-tight">{STEP_TITLES[step - 1]}</h1>

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
                <div role="group" aria-label="Color" className="flex flex-col gap-2.5">
                  <span className="text-[13px] text-muted">Color</span>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={colorId === c.id}
                        aria-label={c.name}
                        onClick={() => setColorId(c.id)}
                        className="box-border size-11 rounded-full border-2 bg-transparent p-1"
                        style={{ borderColor: colorId === c.id ? "var(--text)" : "transparent" }}
                      >
                        <span className="block size-full rounded-full" style={{ background: c.hex }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Meta de horas" className="flex flex-col gap-2.5">
                  <span className="text-[13px] text-muted">Meta de horas</span>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={goal === g}
                        onClick={() => setGoal(g)}
                        className="font-num min-h-12 rounded-button border px-5"
                        style={{ borderColor: goal === g ? colorHex : "var(--line)", background: goal === g ? "var(--track)" : "transparent" }}
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
                  <span className="text-[13px] text-muted">Tiempo por día de práctica</span>
                  <div className="flex flex-wrap gap-2">
                    {DAILY_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={daily === m}
                        onClick={() => setDaily(m)}
                        className="font-num min-h-12 rounded-button border px-4.5"
                        style={{ borderColor: daily === m ? colorHex : "var(--line)", background: daily === m ? "var(--track)" : "transparent" }}
                      >
                        {formatMinutesLong(m)}
                      </button>
                    ))}
                  </div>
                </div>
                <div role="group" aria-label="Días por semana" className="flex flex-col gap-2.5">
                  <span className="text-[13px] text-muted">Días por semana</span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={days === d}
                        onClick={() => setDays(d)}
                        className="font-num flex size-13 items-center justify-center rounded-button border"
                        style={{ borderColor: days === d ? colorHex : "var(--line)", background: days === d ? "var(--track)" : "transparent" }}
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
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line px-4.5 py-4">
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
                    <button
                      type="button"
                      role="switch"
                      aria-checked={remind}
                      aria-label="Activar recordatorio diario"
                      onClick={() => setRemind((r) => !r)}
                      className="relative h-11 w-13 border-0 bg-transparent p-0"
                    >
                      <span className="absolute left-0 top-2 h-7 w-13 rounded-chip" style={{ background: remind ? colorHex : "var(--line)" }} />
                      <span
                        className="absolute top-3 size-5 rounded-full bg-text transition-transform"
                        style={{ transform: remind ? "translateX(28px)" : "translateX(4px)" }}
                      />
                    </button>
                  </div>
                </div>
                <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
                  <dt className="text-sm text-muted">Habilidad</dt>
                  <dd className="m-0 font-semibold">{displayName}</dd>
                  <dt className="text-sm text-muted">Meta</dt>
                  <dd className="font-num m-0">{formatInt(goal)} h</dd>
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
                {step < 3 && <Button onClick={() => setStep((s) => s + 1)}>Siguiente</Button>}
                {step === 3 && (
                  <Button onClick={handleCreate} disabled={creating}>
                    Crear habilidad
                  </Button>
                )}
              </div>
            </div>
          </section>

          <aside aria-label="Tu camino" className="flex min-w-0 flex-[2_1_320px] flex-col gap-5.5 rounded-card border border-line bg-card p-7">
            <div className="flex items-center gap-3">
              <span className="size-3.5 rounded-full" style={{ background: colorHex }} />
              <h2 className="m-0 text-xl font-bold">{displayName}</h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="label-xs">A este ritmo llegas a la meta en</span>
              <span className="font-num text-[44px] font-medium leading-tight" style={{ color: colorHex }}>
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
