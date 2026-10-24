"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
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

// Field label matching design-reference/pomodoro/html/PomoOnboarding.dc.html's
// `.lbl` (14px bold muted gray, not the "Punto"-era mono/uppercase
// `.label-xs` — see app/globals.css, that style belongs to the previous
// redesign and reads wrong against this design's plain sans typography).
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-bold text-card-solid-muted">
      {children}
    </label>
  );
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
    <div className="flex min-h-screen flex-col bg-mode-bg text-mode-ink">
      <header className="mx-auto flex h-[60px] w-full max-w-[620px] items-center px-5">
        <Wordmark className="text-mode-ink" />
      </header>

      <main className="mx-auto w-full max-w-[620px] flex-1 px-5 pb-10">
        <div className="mb-5 mt-6 text-center sm:mt-8">
          <span className="text-[14px] font-semibold tracking-[0.04em] text-mode-ink-muted">PASO {step} DE 4</span>
          <div className="mt-3 flex justify-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4} aria-label="Progreso del inicio">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                aria-hidden="true"
                className="h-1.5 rounded-chip bg-mode-ink transition-all"
                style={{ width: n === step ? 24 : 6, opacity: n === step ? 1 : 0.45 }}
              />
            ))}
          </div>
        </div>

        <Card tone="solid" className="mx-auto w-full max-w-[480px] p-6 sm:p-7">
          {step === 1 && (
            <section className="flex flex-col gap-6">
              <div>
                <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-tight text-card-solid-ink sm:text-[26px]">
                  Ponle nombre
                  <br />y color.
                </h1>
              </div>
              <div>
                <FieldLabel htmlFor="pn">Nombre</FieldLabel>
                <Input id="pn" value={petName} onChange={(e) => setPetNameLocal(e.target.value.slice(0, 14))} className="text-[18px]" />
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] font-bold text-card-solid-muted">Color</span>
                <div className="flex gap-3">
                  {PALETTE.map(([name, hex], i) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={colorIdx === i}
                      aria-label={name}
                      onClick={() => setColorIdx(i)}
                      className="size-10 shrink-0 rounded-full border border-card-solid-line p-0 transition-[box-shadow]"
                      style={{
                        background: hex,
                        // --card-solid-ink flips brightness with the theme
                        // (near-black on the light card, near-white on the
                        // dark card), so the ring stays visible in both —
                        // --flat-dark is fixed-dark in both themes and was
                        // nearly invisible against the dark card (#222 on
                        // #202024), a real contrast bug caught in the real-
                        // Chromium dark-mode screenshot during verification.
                        boxShadow: colorIdx === i ? "0 0 0 2px var(--card-solid), 0 0 0 4px var(--card-solid-ink)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="flex flex-col gap-6">
              <div>
                <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-tight text-card-solid-ink sm:text-[26px]">¿Qué quieres dominar?</h1>
                <p className="m-0 mt-1.5 text-[14px] text-card-solid-muted">Empieza con una. Puedes añadir más después.</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
              <div>
                <FieldLabel htmlFor="ot">¿Otra? Escríbela</FieldLabel>
                <Input id="ot" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ej: Ajedrez, Piano, Dibujo…" />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="flex flex-col gap-6">
              <div>
                <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-tight text-card-solid-ink sm:text-[26px]">¿Cuánto vas a practicar?</h1>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] font-bold text-card-solid-muted">Tiempo por día</span>
                <div className="flex flex-wrap gap-2">
                  {DAILY_OPTS.map((m) => (
                    <Chip key={m} pressed={daily === m} onClick={() => setDaily(m)}>
                      {hm(m)}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[14px] font-bold text-card-solid-muted">Días por semana</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <Chip key={n} pressed={days === n} onClick={() => setDays(n)} aria-label={`${n} día${n > 1 ? "s" : ""} por semana`} className="w-10 justify-center px-0">
                      {n}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="rt">Te aviso a las</FieldLabel>
                <Input id="rt" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="max-w-[160px]" />
              </div>
              <div className="rounded-button bg-surface-muted p-4 text-center text-surface-muted-ink">
                <span className="block text-[13px] font-bold uppercase tracking-[0.04em] opacity-70">A este ritmo</span>
                <div className="mt-1 text-[16px] font-semibold tracking-tight sm:text-[18px]">
                  {hm(weeklyMin)} por semana · llegas en <span style={{ color: "var(--mode-bg)" }}>{eta}</span>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="flex flex-col gap-1">
              <div className="mb-3">
                <h1 className="m-0 text-[24px] font-bold leading-[1.15] tracking-tight text-card-solid-ink sm:text-[26px]">Todo listo.</h1>
              </div>
              {[
                ["Compañero", petName.trim() || "Tomi"],
                ["Habilidad", skillName],
                ["Ritmo", `${hm(daily)} · ${days} días por semana`],
                ["Aviso", `A las ${time}`],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-baseline justify-between gap-4 border-t border-card-solid-line py-3">
                  <span className="text-[14px] font-bold text-card-solid-muted">{k}</span>
                  <span className="text-[15px] font-semibold text-card-solid-ink">{v}</span>
                </div>
              ))}
              <div className="mt-4 flex items-center gap-3.5 rounded-button bg-surface-muted p-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
                  style={{ background: "var(--flat-dark)", color: "var(--flat-dark-ink)" }}
                >
                  $
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-surface-muted-ink">+{WELCOME_COINS} monedas de bienvenida</div>
                  <div className="mt-0.5 text-[13px] text-surface-muted-ink opacity-75">Listo para empezar con {petName.trim() || "Tomi"}.</div>
                </div>
              </div>
            </section>
          )}

          <div className="mt-7 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="light"
              size="md"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              style={{ visibility: step === 1 ? "hidden" : "visible" }}
              className="font-sans text-[15px] font-semibold normal-case tracking-normal"
            >
              Atrás
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                variant="dark"
                size="md"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="min-w-[130px] font-sans text-[15px] font-semibold normal-case tracking-normal"
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                variant="dark"
                size="md"
                onClick={finish}
                disabled={finishing}
                className="min-w-[130px] font-sans text-[15px] font-semibold normal-case tracking-normal"
              >
                {finishing ? "Un momento…" : "Empezar a practicar"}
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-5 text-center">
          <button type="button" onClick={skip} className="text-[14px] text-mode-ink-muted underline underline-offset-2 transition-colors hover:text-mode-ink">
            Saltar por ahora
          </button>
        </div>
      </main>

      <p className="m-0 border-t border-card-tint-border px-5 py-5 text-center text-[13px] text-mode-ink-muted sm:px-10">
        <Link href="/login" className="underline underline-offset-2 transition-colors hover:text-mode-ink">
          Cerrar sesión
        </Link>
      </p>
    </div>
  );
}
