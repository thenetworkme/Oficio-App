"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createReminder } from "@/lib/firestore/reminders";
import { createSkill } from "@/lib/firestore/skills";
import { updateProfile } from "@/lib/firestore/profiles";
import { setPetName } from "@/lib/firestore/economy";
import { WELCOME_COINS } from "@/lib/economy";

const PALETTE: [string, string][] = [
  ["Rosa", "#FF8FB8"],
  ["Amarillo", "#FFD84D"],
  ["Verde", "#7BE0A4"],
  ["Cielo", "#7CC4FF"],
  ["Naranja", "#FF9F5A"],
];
const SKILL_OPTIONS: [string, string][] = [
  ["Programación", "💻"],
  ["Inglés", "🗣️"],
  ["Guitarra", "🎸"],
  ["Piano", "🎹"],
  ["Dibujo", "✏️"],
  ["Escritura", "📝"],
  ["Ajedrez", "♟️"],
  ["Fitness", "🏋️"],
];
const DAILY_OPTS = [30, 60, 90, 120, 180];

function hm(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [petName, setPetNameLocal] = useState("Tomi");
  const [colorIdx, setColorIdx] = useState(0);
  const [skillIdx, setSkillIdx] = useState(0);
  const [custom, setCustom] = useState("");
  const [daily, setDaily] = useState(60);
  const [days, setDays] = useState(5);
  const [time, setTime] = useState("07:00");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile?.onboardingCompletedAt) router.replace("/");
  }, [loading, user, profile, router]);

  const skillName = custom.trim() || SKILL_OPTIONS[skillIdx][0];
  const weeklyMin = daily * days;
  const years = 10000 / ((weeklyMin / 60) * 52.1);
  const eta = years >= 2 ? `${Math.round(years * 10) / 10} años` : `${Math.round(years * 12)} meses`;

  async function finish() {
    if (!user) return;
    setFinishing(true);
    try {
      await setPetName(user.uid, petName.trim() || "Tomi");
      await createSkill({
        userId: user.uid,
        name: skillName,
        color: PALETTE[colorIdx][1],
        goalHours: 10000,
        initialHours: 0,
        dailyGoalMin: daily,
        daysPerWeek: days,
      });
      await createReminder({
        userId: user.uid,
        skillId: null,
        kind: "practice",
        timeOfDay: time,
        days: [1, 2, 3, 4, 5, 6, 7].slice(0, days),
        message: `${skillName}: práctica`,
        enabled: true,
      });
      await updateProfile(user.uid, { onboardingCompletedAt: Date.now() });
      router.replace("/");
    } finally {
      setFinishing(false);
    }
  }

  async function skip() {
    if (user) await updateProfile(user.uid, { onboardingCompletedAt: Date.now() }).catch(() => void 0);
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[68px] items-center gap-6 border-b border-line px-5 sm:px-10">
        <Wordmark />
        <span className="label-xs ml-auto">Paso {step} de 4</span>
        <button type="button" onClick={skip} className="label-xs text-muted transition-colors hover:text-ink">
          Saltar
        </button>
      </header>

      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-12 sm:px-10 sm:py-14">
        <div
          className="mb-12 flex gap-1.5 sm:mb-16"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label="Progreso del inicio"
        >
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="h-1 flex-1 rounded-chip" style={{ background: n <= step ? "var(--ink)" : "var(--line)" }} />
          ))}
        </div>

        {step === 1 && (
          <section className="flex flex-col gap-9">
            <div>
              <span className="label-xs mb-3.5 block">01 · Tu compañero</span>
              <h1 className="m-0 text-[40px] font-light leading-[0.98] tracking-tighter text-ink sm:text-[56px]">
                Ponle nombre
                <br />y color.
              </h1>
            </div>
            <label className="block max-w-[360px]">
              <Label htmlFor="pn">Nombre</Label>
              <Input id="pn" value={petName} onChange={(e) => setPetNameLocal(e.target.value.slice(0, 14))} className="mt-2 text-[22px]" />
            </label>
            <div className="flex flex-col gap-3">
              <span className="label-xs">Color</span>
              <div className="flex gap-3">
                {PALETTE.map(([name, hex], i) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={colorIdx === i}
                    aria-label={name}
                    onClick={() => setColorIdx(i)}
                    className="size-11 shrink-0 rounded-full border border-border p-0 transition-[box-shadow]"
                    style={{
                      background: hex,
                      boxShadow: colorIdx === i ? "0 0 0 2px var(--paper), 0 0 0 4px var(--ink)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-9">
            <div>
              <span className="label-xs mb-3.5 block">02 · Tu primera habilidad</span>
              <h1 className="m-0 text-[40px] font-light leading-[0.98] tracking-tighter text-ink sm:text-[56px]">¿Qué quieres dominar?</h1>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {SKILL_OPTIONS.map(([name, icon], i) => (
                <Chip
                  key={name}
                  pressed={!custom.trim() && skillIdx === i}
                  onClick={() => {
                    setSkillIdx(i);
                    setCustom("");
                  }}
                >
                  {icon} {name}
                </Chip>
              ))}
            </div>
            <label className="block max-w-[420px]">
              <Label htmlFor="ot">¿Otra? Escríbela</Label>
              <Input id="ot" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ej: Ajedrez, Piano, Dibujo…" className="mt-2" />
            </label>
            <p className="m-0 text-muted">Después puedes agregar más. Mejor una a la vez.</p>
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col gap-9">
            <div>
              <span className="label-xs mb-3.5 block">03 · Tu ritmo</span>
              <h1 className="m-0 text-[40px] font-light leading-[0.98] tracking-tighter text-ink sm:text-[56px]">¿Cuánto vas a practicar?</h1>
            </div>
            <div className="flex flex-col gap-3">
              <span className="label-xs">Tiempo por día</span>
              <div className="flex flex-wrap gap-2.5">
                {DAILY_OPTS.map((m) => (
                  <Chip key={m} pressed={daily === m} onClick={() => setDaily(m)}>
                    {hm(m)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="label-xs">Días por semana</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Chip key={n} pressed={days === n} onClick={() => setDays(n)} aria-label={`${n} día${n > 1 ? "s" : ""} por semana`} className="w-10 justify-center px-0">
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
            <label className="block max-w-[220px]">
              <Label htmlFor="rt">Te aviso a las</Label>
              <Input id="rt" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2" />
            </label>
            <Card className="flex flex-col gap-1.5 p-6">
              <span className="label-xs">A este ritmo</span>
              <div className="font-mono text-[22px] tracking-tight text-ink sm:text-[26px]">
                {hm(weeklyMin)} por semana · llegas en <span className="text-signal">{eta}</span>
              </div>
            </Card>
          </section>
        )}

        {step === 4 && (
          <section className="flex flex-col gap-4">
            <div className="mb-5">
              <span className="label-xs mb-3.5 block">04 · Listo</span>
              <h1 className="m-0 text-[40px] font-light leading-[0.98] tracking-tighter text-ink sm:text-[56px]">Todo listo.</h1>
            </div>
            {[
              ["Compañero", petName.trim() || "Tomi"],
              ["Habilidad", skillName],
              ["Ritmo", `${hm(daily)} · ${days} días por semana`],
              ["Aviso", `A las ${time}`],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap items-baseline justify-between gap-4 border-t border-line py-4">
                <span className="label-xs">{k}</span>
                <span className="font-mono text-[16px] text-ink">{v}</span>
              </div>
            ))}
            <Card className="mt-2 flex items-center gap-4 p-6">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-signal text-[18px] font-medium text-ink-solid">
                $
              </span>
              <div>
                <span className="text-[18px] text-ink">+{WELCOME_COINS} monedas de bienvenida</span>
                <div className="mt-0.5 text-[14px] text-muted">Pásate por la tienda y arréglale el look a {petName.trim() || "Tomi"}.</div>
              </div>
            </Card>
          </section>
        )}

        <div className="mt-12 flex flex-wrap justify-between gap-4">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} style={{ visibility: step === 1 ? "hidden" : "visible" }}>
            Atrás
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Continuar
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={finishing}>
              {finishing ? "Un momento…" : "Empezar a practicar"}
            </Button>
          )}
        </div>
      </main>

      <p className="m-0 border-t border-line px-5 py-5 text-center text-[13px] sm:px-10">
        <Link href="/login" className="text-muted underline decoration-border underline-offset-2 transition-colors hover:text-ink">
          Cerrar sesión
        </Link>
      </p>
    </div>
  );
}
