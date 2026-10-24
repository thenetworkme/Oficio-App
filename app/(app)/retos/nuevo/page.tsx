"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { useSound } from "@/lib/sound/SoundProvider";
import { canStartNewChallenge, createChallenge } from "@/lib/firestore/challenges";
import { createSkill } from "@/lib/firestore/skills";
import { formatDateEs, formatMinutesLong } from "@/lib/format";
import { percentOfTenThousandHours, projectedEndDate } from "@/lib/challenge";
import { dateKeyInTz } from "@/lib/tz";
import { CHALLENGE_COLORS, MAX_ACTIVE_CHALLENGES } from "@/lib/types";

const DURATIONS = [7, 14, 21, 30, 60, 100];
const MINUTE_OPTIONS = [15, 30, 45, 60, 120];
const GRACE_OPTIONS = [0, 1, 2, 3];
const START_OPTIONS = ["Hoy", "Mañana", "Lunes"] as const;

function fmtMin(m: number): string {
  return m >= 60 ? `${m / 60} h` : `${m} min`;
}

function nextMonday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const add = day === 1 ? 7 : ((8 - day) % 7 || 7);
  d.setDate(d.getDate() + add);
  return d;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[14px] font-bold" style={{ color: "var(--card-solid-muted)" }}>
      {children}
    </span>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap gap-2">{children}</div>;
}

export default function NuevoRetoPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { skills } = useAppData();
  const timezone = profile?.timezone ?? "America/Santo_Domingo";
  const sound = useSound();

  const [name, setName] = useState("");
  const [skillIdx, setSkillIdx] = useState(0); // index into skills, or skills.length for "Nueva habilidad"
  const [newSkillName, setNewSkillName] = useState("");
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [goalMin, setGoalMin] = useState(30);
  const [grace, setGrace] = useState(2);
  const [startIdx, setStartIdx] = useState(0);
  const [remindTime, setRemindTime] = useState("19:00");
  const [remind, setRemind] = useState(true);
  const [why, setWhy] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNewSkill = skillIdx === skills.length;
  const linkedSkillName = isNewSkill ? newSkillName.trim() || "tu nueva habilidad" : (skills[skillIdx]?.name ?? "tu habilidad");

  const startDate = useMemo(() => {
    const today = new Date();
    if (startIdx === 0) return today;
    if (startIdx === 1) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return d;
    }
    return nextMonday(today);
  }, [startIdx]);

  const startKey = dateKeyInTz(startDate, timezone);
  const endKey = projectedEndDate(startKey, days);
  const endDate = new Date(`${endKey}T00:00:00`);
  const pctOf10k = percentOfTenThousandHours(days, goalMin);
  const totalMin = days * goalMin;
  const minDaysNeeded = Math.max(0, days - grace);
  const shownName = name.trim() || `${days} días de ${linkedSkillName.toLowerCase()}`;
  const previewCells = Math.min(days, 30);

  async function handleCreate() {
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      const canStart = await canStartNewChallenge(user.uid, MAX_ACTIVE_CHALLENGES);
      if (!canStart) {
        setError(`Ya tienes ${MAX_ACTIVE_CHALLENGES} retos activos. Cierra o pausa uno para abrir otro.`);
        return;
      }
      let skillId: string;
      if (isNewSkill) {
        skillId = await createSkill({
          userId: user.uid,
          name: newSkillName.trim() || name,
          color: "accent",
          goalHours: 10000,
          initialHours: 0,
          dailyGoalMin: goalMin,
          daysPerWeek: 7,
        });
      } else {
        skillId = skills[skillIdx].id;
      }
      const challengeId = await createChallenge({
        userId: user.uid,
        skillId,
        name: shownName,
        why: why.trim(),
        totalDays: days,
        dailyGoalMin: goalMin,
        graceDaysAllowed: grace,
        color: CHALLENGE_COLORS[0],
        startedAt: startDate.getTime(),
        reminderTime: remindTime,
        reminderEnabled: remind,
      });
      sound.playSuccess();
      router.push(`/retos/${challengeId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 text-mode-ink">
        <div>
          <Link href="/retos" className="mb-2 inline-flex items-center gap-1.5 text-[14px]" style={{ color: "var(--mode-ink-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Retos
          </Link>
          <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-tight">Crear reto</h1>
          <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
            Un objetivo corto, con principio y fin.
          </p>
        </div>

        <Card tone="solid" className="p-6 sm:p-7">
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col">
            <label className="mb-5 block">
              <FieldLabel>Nombre del reto</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ej. ${days} días de ${linkedSkillName.toLowerCase()}`} className="text-[18px] font-semibold" />
            </label>

            <div className="mb-5">
              <FieldLabel>Habilidad</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <Chip key={s.id} pressed={skillIdx === i} onClick={() => setSkillIdx(i)}>
                    {s.name}
                  </Chip>
                ))}
                <Chip pressed={isNewSkill} onClick={() => setSkillIdx(skills.length)}>
                  Nueva habilidad
                </Chip>
              </div>
              {isNewSkill && (
                <Input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Nombre de la nueva habilidad"
                  className="mt-2.5 max-w-xs"
                />
              )}
            </div>

            <div>
              <FieldLabel>Duración</FieldLabel>
              <ChipRow>
                {DURATIONS.map((d) => (
                  <Chip
                    key={d}
                    pressed={days === d}
                    onClick={() => {
                      setDays(d);
                      setCustomDays("");
                    }}
                  >
                    {d} días
                  </Chip>
                ))}
                <Input
                  type="number"
                  min={3}
                  max={365}
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (n >= 3) setDays(Math.min(365, n));
                  }}
                  placeholder="Otra"
                  aria-label="Otra duración en días"
                  className="w-24"
                />
              </ChipRow>
            </div>

            <div>
              <FieldLabel>Mínimo diario</FieldLabel>
              <ChipRow>
                {MINUTE_OPTIONS.map((m) => (
                  <Chip key={m} pressed={goalMin === m} onClick={() => setGoalMin(m)}>
                    {fmtMin(m)}
                  </Chip>
                ))}
              </ChipRow>
            </div>

            <div>
              <FieldLabel>Empieza</FieldLabel>
              <ChipRow>
                {START_OPTIONS.map((label, i) => (
                  <Chip key={label} pressed={startIdx === i} onClick={() => setStartIdx(i)}>
                    {label}
                  </Chip>
                ))}
                <span className="font-num inline-flex min-h-10 items-center text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
                  {formatDateEs(startDate)}
                </span>
              </ChipRow>
            </div>

            <div>
              <FieldLabel>Días de gracia</FieldLabel>
              <ChipRow>
                {GRACE_OPTIONS.map((g) => (
                  <Chip key={g} pressed={grace === g} onClick={() => setGrace(g)}>
                    {g}
                  </Chip>
                ))}
                <span className="font-num inline-flex min-h-10 items-center text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
                  fallas permitidas sin romper la racha
                </span>
              </ChipRow>
            </div>

            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-semibold" style={{ color: "var(--card-solid-ink)" }}>
                  Recordatorio diario
                </div>
                <div className="text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
                  Todos los días a las {remindTime}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input type="time" value={remindTime} onChange={(e) => setRemindTime(e.target.value)} className="w-[135px] min-h-10 py-1 text-[14px]" />
                <Switch checked={remind} onCheckedChange={setRemind} label="Recordarme cada día" />
              </div>
            </div>

            <label className="mb-1.5 block">
              <FieldLabel>Mi porqué</FieldLabel>
              <textarea
                rows={3}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="¿Por qué quieres lograr este reto?"
                className="w-full resize-y rounded-button border-0 bg-surface-muted px-3.5 py-2.5 text-[15px] leading-snug text-surface-muted-ink outline-none placeholder:text-surface-muted-ink placeholder:opacity-60 focus:ring-2 focus:ring-[var(--mode-bg)]"
              />
            </label>
            <p className="m-0 mb-5 text-[13px]" style={{ color: "var(--card-solid-muted)" }}>
              Se lo recordarás a tu yo del día {Math.round(days / 2)}, cuando cueste.
            </p>

            <div className="rounded-card p-5" style={{ background: "var(--surface-muted)" }}>
              <div className="text-[17px] font-extrabold" style={{ color: "var(--card-solid-ink)" }}>
                {shownName}
              </div>
              <div className="mt-1 text-[14px]" style={{ color: "var(--card-solid-muted)" }}>
                {days} días · mínimo {fmtMin(goalMin)} al día · {formatMinutesLong(totalMin)} en total
              </div>
              <div className="mt-3.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(15, previewCells)}, 1fr)` }} aria-hidden="true">
                {Array.from({ length: previewCells }, (_, i) => (
                  <span key={i} className="aspect-square rounded-[3px]" style={{ background: "var(--surface-muted-hover)" }} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-3">
                <Fact k="Días mínimos" v={`${minDaysNeeded} de ${days}`} />
                <Fact k="Termina" v={formatDateEs(endDate)} />
                <Fact k="Aporta" v={`${pctOf10k < 0.1 ? "< 0,1" : pctOf10k.toFixed(2).replace(".", ",")} % de 10.000 h`} />
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-card p-4 text-[14px] font-medium" style={{ background: "rgba(214,67,30,0.12)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <Button asChild variant="light" size="md">
                <Link href="/retos">Cancelar</Link>
              </Button>
              <Button type="button" variant="dark" size="md" disabled={creating} onClick={handleCreate} className="min-w-[150px]">
                {creating ? "Creando…" : "Crear reto"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ color: "var(--card-solid-muted)" }}>{k}:</span>
      <span className="font-num font-semibold" style={{ color: "var(--card-solid-ink)" }}>
        {v}
      </span>
    </div>
  );
}
