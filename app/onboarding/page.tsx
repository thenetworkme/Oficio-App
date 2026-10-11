"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
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

const TITLES = ["Conoce a tu compañero.", "¿Qué quieres dominar?", "¿Cuánto vas a practicar?", "Todo listo."];
const BUBBLES = (pet: string) => [
  `¡Hola! Soy ${pet}. Voy a contar tus horas contigo.`,
  "Elige una. Yo la anoto en tu álbum.",
  "Mejor poco todos los días que mucho un día.",
  "¡Vamos por las primeras 10.000 h!",
];

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

  const bubbles = BUBBLES(petName.trim() || "Tomi");

  return (
    <div className="flex min-h-screen flex-col gap-7 bg-paper px-5 py-7 sm:px-12 sm:py-9">
      <header className="flex flex-wrap items-center gap-5">
        <div className="bx inline-flex bg-a1 px-4.5 py-1.5 text-ink-solid" style={{ transform: "rotate(-2deg)" }}>
          <span className="text-[26px] font-bold tracking-tight">oficio!</span>
        </div>
        <div className="ml-auto flex max-w-[420px] flex-1 gap-2.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4} aria-label="Progreso del inicio">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="h-4.5 flex-1 rounded-chip border-[3px] border-ink" style={{ background: n <= step ? "var(--ink)" : "var(--card)" }} />
          ))}
        </div>
        <button type="button" onClick={skip} className="font-bold underline">
          Saltar
        </button>
      </header>

      <main className="flex flex-1 flex-wrap items-center gap-10">
        <aside className="flex min-w-[300px] flex-[0_1_420px] flex-col items-center gap-4.5">
          <div className="relative">
            <Mascot size={260} bodyColor={PALETTE[colorIdx][1]} hat={step >= 4 ? "cap" : null} mood={step === 4 ? "cheer" : "idle"} />
            <div className="bx absolute -left-4 -top-3.5 max-w-[230px] bg-card px-4.5 py-2.5 font-bold" style={{ transform: "rotate(-5deg)" }}>
              {bubbles[step - 1]}
            </div>
          </div>
          <span className="font-num font-bold">
            {petName.trim() || "Tomi"} · Nv. 1
          </span>
        </aside>

        <section className="bx flex min-w-0 flex-[1_1_560px] flex-col gap-6 p-9">
          <span className="label-xs">Paso {step} de 4</span>
          <h1 className="m-0 text-[42px] font-bold leading-[1.05] tracking-tight sm:text-[52px]">{TITLES[step - 1]}</h1>

          {step === 1 && (
            <div className="flex flex-col gap-5.5">
              <div className="flex flex-col gap-2">
                <span className="label-xs">Color</span>
                <div className="flex gap-3">
                  {PALETTE.map(([name, hex], i) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={colorIdx === i}
                      aria-label={name}
                      onClick={() => setColorIdx(i)}
                      className="size-13 rounded-full border-[3px] border-ink p-0"
                      style={{ background: hex, boxShadow: colorIdx === i ? "5px 5px 0 var(--shadow)" : "none" }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pn">Ponle nombre</Label>
                <Input id="pn" value={petName} onChange={(e) => setPetNameLocal(e.target.value.slice(0, 14))} className="text-[22px] font-bold" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4.5">
              <span className="label-xs">Elige tu primera habilidad</span>
              <div className="flex flex-wrap gap-2.5">
                {SKILL_OPTIONS.map(([name, icon], i) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={!custom.trim() && skillIdx === i}
                    onClick={() => {
                      setSkillIdx(i);
                      setCustom("");
                    }}
                    className={cn(
                      "bx press min-h-12 px-4 text-[16px] font-bold",
                      !custom.trim() && skillIdx === i && "text-ink-solid",
                    )}
                    style={{ background: !custom.trim() && skillIdx === i ? PALETTE[colorIdx][1] : "var(--card)" }}
                  >
                    {icon} {name}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ot">¿Otra? Escríbela</Label>
                <Input id="ot" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ej: Ajedrez, Piano, Dibujo…" />
              </div>
              <p className="m-0 font-medium">Después puedes agregar más. Mejor una a la vez.</p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5.5">
              <div className="flex flex-col gap-2">
                <span className="label-xs">Tiempo por día</span>
                <div className="flex flex-wrap gap-2">
                  {DAILY_OPTS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={daily === m}
                      onClick={() => setDaily(m)}
                      className={cn("bx press min-h-12 px-4 font-bold", daily === m && "text-ink-solid")}
                      style={{ background: daily === m ? PALETTE[colorIdx][1] : "var(--card)" }}
                    >
                      {hm(m)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="label-xs">Días por semana</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={days === n}
                      onClick={() => setDays(n)}
                      className={cn("bx press min-h-13 flex-1 text-[18px] font-bold", days === n && "text-ink-solid")}
                      style={{ background: days === n ? PALETTE[colorIdx][1] : "var(--card)" }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex max-w-[260px] flex-col gap-1.5">
                <Label htmlFor="rt">Te aviso a las</Label>
                <Input id="rt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="bx p-4.5 text-ink-solid" style={{ background: "var(--a1)", transform: "rotate(-1deg)" }}>
                <span className="label-xs !text-ink-solid opacity-70">A este ritmo</span>
                <div className="text-[26px] font-bold tracking-tight">
                  {hm(weeklyMin)} por semana · llegas en {eta}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              {[
                ["Compañero", `${petName.trim() || "Tomi"}`],
                ["Habilidad", skillName],
                ["Ritmo", `${hm(daily)} · ${days} días por semana`],
                ["Aviso", `A las ${time}`],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-4 border-t-2 border-dashed border-ink py-3">
                  <span className="label-xs min-w-[120px] pt-1">{k}</span>
                  <span className="text-[18px] font-bold">{v}</span>
                </div>
              ))}
              <div className="bx flex items-center gap-3.5 p-4.5 text-ink-solid" style={{ background: "var(--a3)", transform: "rotate(1deg)" }}>
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full border-[3px] border-ink bg-paper text-ink text-[22px] font-bold">
                  $
                </span>
                <div>
                  <b className="text-[20px]">+{WELCOME_COINS} monedas de bienvenida</b>
                  <div className="font-medium">Pásate por la tienda y arréglale el look a {petName.trim() || "Tomi"}.</div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-1 flex flex-wrap justify-between gap-4">
            <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="bx press min-h-13 bg-card px-5 text-[18px] font-bold" style={{ visibility: step === 1 ? "hidden" : "visible" }}>
              Atrás
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="bx press min-h-13 px-5 text-[18px] font-bold text-ink-solid"
                style={{ background: "var(--a1)" }}
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={finishing}
                className="bx press min-h-13 px-5 text-[18px] font-bold text-ink-solid disabled:opacity-60"
                style={{ background: "var(--a2)" }}
              >
                {finishing ? "Un momento…" : "Entrar a mi panel →"}
              </button>
            )}
          </div>
        </section>
      </main>
      <p className="m-0 text-center text-[13px] text-muted">
        <Link href="/login" className="underline">
          Cerrar sesión
        </Link>
      </p>
    </div>
  );
}
