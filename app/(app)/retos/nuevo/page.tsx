"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
const GRACE_OPTIONS = [0, 1, 2, 3];
const START_OPTIONS = ["Hoy", "Mañana", "Lunes"] as const;
const COLOR_NAMES = ["Ámbar", "Verde", "Rosa", "Cielo", "Naranja"];

function nextMonday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const add = day === 1 ? 7 : ((8 - day) % 7 || 7);
  d.setDate(d.getDate() + add);
  return d;
}

export default function NuevoRetoPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { skills } = useAppData();
  const timezone = profile?.timezone ?? "America/Santo_Domingo";
  const sound = useSound();

  const [name, setName] = useState("30 días de guitarra");
  const [skillIdx, setSkillIdx] = useState(0); // index into skills, or skills.length for "Nueva habilidad"
  const [newSkillName, setNewSkillName] = useState("");
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("30");
  const [goalMin, setGoalMin] = useState(30);
  const [grace, setGrace] = useState(2);
  const [startIdx, setStartIdx] = useState(0);
  const [remindTime, setRemindTime] = useState("19:00");
  const [remind, setRemind] = useState(true);
  const [colorIdx, setColorIdx] = useState(0);
  const [why, setWhy] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const color = CHALLENGE_COLORS[colorIdx];
  const isNewSkill = skillIdx === skills.length;
  const linkedSkillName = isNewSkill ? (newSkillName.trim() || "tu nueva habilidad") : (skills[skillIdx]?.name ?? "tu habilidad");

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
        name: name.trim() || "Mi reto",
        why: why.trim(),
        totalDays: days,
        dailyGoalMin: goalMin,
        graceDaysAllowed: grace,
        color,
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
      <section className="border-b border-line pb-8">
        <Link href="/retos" className="label-xs mb-4.5 inline-block text-muted transition-colors hover:text-ink">
          ← Retos
        </Link>
        <span className="label-xs mb-3.5 block">Nuevo reto</span>
        <h1 className="m-0 text-[48px] font-light leading-[0.95] tracking-tight sm:text-[64px]">Ponte a prueba.</h1>
      </section>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-0">
        <form onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-col gap-9 lg:border-r lg:border-line lg:pr-14">
          <Field n="01" label="Nombre del reto">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. 30 días de guitarra"
              className="text-[32px] font-light tracking-tight sm:text-[40px]"
            />
          </Field>

          <Field n="02" label="Habilidad vinculada">
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
            {isNewSkill ? (
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Nombre de la nueva habilidad"
                className="mt-3 max-w-xs"
              />
            ) : null}
            <span className="font-num mt-2 block text-[13px] text-muted">
              {isNewSkill ? "Crearemos una habilidad nueva con tu reto." : `Las horas del reto suman a las 10.000 h de ${linkedSkillName}.`}
            </span>
          </Field>

          <Field n="03" label="Duración">
            <div className="flex flex-wrap items-center gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  pressed={days === d}
                  onClick={() => {
                    setDays(d);
                    setCustomDays(String(d));
                  }}
                >
                  {d} días
                </Chip>
              ))}
              <Label htmlFor="cd" className="ml-2">
                Otra
              </Label>
              <Input
                id="cd"
                type="number"
                min={3}
                max={365}
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  const n = Math.max(3, Math.min(365, parseInt(e.target.value, 10) || 30));
                  setDays(n);
                }}
                className="w-20"
              />
            </div>
          </Field>

          <Field n="04" label="Mínimo diario">
            <div className="flex items-center gap-5">
              <Stepper label="Menos 5 minutos" onClick={() => setGoalMin((m) => Math.max(5, m - 5))}>
                −
              </Stepper>
              <span className="font-num min-w-[150px] text-center text-[40px] leading-none tracking-tight sm:text-[48px]">{goalMin} min</span>
              <Stepper label="Más 5 minutos" onClick={() => setGoalMin((m) => Math.min(240, m + 5))}>
                +
              </Stepper>
            </div>
          </Field>

          <Field n="05" label="Reglas">
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-5">
              <div>
                <div className="text-[17px]">Días de gracia</div>
                <div className="text-[13px] text-muted">Fallas permitidas sin romper la racha</div>
              </div>
              <div className="flex items-center gap-2">
                {GRACE_OPTIONS.map((g) => (
                  <Chip key={g} pressed={grace === g} onClick={() => setGrace(g)}>
                    {g}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-5">
              <div>
                <div className="text-[17px]">Empieza</div>
                <div className="text-[13px] text-muted">{formatDateEs(startDate)}</div>
              </div>
              <div className="flex items-center gap-2">
                {START_OPTIONS.map((label, i) => (
                  <Chip key={label} pressed={startIdx === i} onClick={() => setStartIdx(i)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line py-5">
              <div>
                <div className="text-[17px]">Recordatorio diario</div>
                <div className="text-[13px] text-muted">Todos los días a las {remindTime}</div>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  id="rt"
                  type="time"
                  value={remindTime}
                  onChange={(e) => setRemindTime(e.target.value)}
                  className="w-[110px] min-h-0 pb-1 pt-0 text-[15px]"
                />
                <Switch checked={remind} onCheckedChange={setRemind} label="Recordarme cada día" />
              </div>
            </div>
          </Field>

          <Field n="06" label="Color">
            <div className="flex gap-3">
              {CHALLENGE_COLORS.map((hex, i) => (
                <button
                  key={hex}
                  type="button"
                  aria-pressed={colorIdx === i}
                  aria-label={COLOR_NAMES[i]}
                  onClick={() => setColorIdx(i)}
                  className="size-11 rounded-full border transition-[border-color]"
                  style={{ background: hex, borderColor: colorIdx === i ? "var(--ink)" : "transparent", outline: colorIdx === i ? "1px solid var(--line)" : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </Field>

          <Field n="07" label="Mi porqué">
            <textarea
              id="why"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="¿Por qué quieres lograr este reto?"
              className="box-border w-full resize-y rounded-card border border-line bg-transparent px-4 py-3.5 text-[16px] leading-snug text-ink placeholder:text-muted focus:border-signal focus:outline-none"
            />
            <span className="font-num mt-2 block text-[13px] text-muted">Se lo recordarás a tu yo del día 15, cuando cueste.</span>
          </Field>

          {error && <div className="rounded-card border border-danger/40 p-4 text-sm font-medium text-danger">{error}</div>}
        </form>

        <aside className="flex min-w-0 flex-col gap-2 pt-8 lg:pt-0 lg:pl-14">
          <span className="label-xs">Vista previa</span>
          <div className="mb-1 flex items-baseline gap-3.5">
            <span className="text-[90px] font-light leading-[0.9] tracking-tight sm:text-[110px]">{days}</span>
            <span className="label-xs">días</span>
          </div>
          <div className="font-num mb-6 text-[14px] text-muted">
            Del <span className="text-ink">{formatDateEs(startDate)}</span> al <span className="text-ink">{formatDateEs(endDate)}</span>
          </div>
          <div className="mb-7 grid grid-cols-10 gap-1.5">
            {Array.from({ length: Math.min(days, 90) }, (_, i) => (
              <span key={i} aria-hidden="true" className="aspect-square rounded-full" style={{ background: i === 0 ? color : "var(--line)" }} />
            ))}
          </div>

          <Fact k="Tiempo total" v={formatMinutesLong(totalMin)} />
          <Fact k="Días mínimos" v={`${minDaysNeeded} de ${days}`} />
          <Fact k="Empieza" v={formatDateEs(startDate)} />
          <Fact k="Termina" v={formatDateEs(endDate)} />
          <Fact k="Aporta" v={`${pctOf10k < 0.1 ? "< 0,1" : pctOf10k.toFixed(2).replace(".", ",")} % de las 10.000 h`} />
          <Fact k="Aviso" v={remind ? `Cada día a las ${remindTime}` : "Sin aviso"} last />

          <p className="font-num mt-5 text-[13px] text-muted">
            {goalMin >= 60
              ? `Ojo: ${goalMin} min al día es mucho para un reto de ${days} días. Mejor una meta que cumplas incluso en un mal día.`
              : "Buen ritmo. Un reto corto y constante gana a uno heroico que abandonas en la primera semana."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={handleCreate} disabled={creating} size="default">
              {creating ? "Creando…" : "Empezar reto"}
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/retos">Cancelar</Link>
            </Button>
          </div>
        </aside>
      </section>
    </>
  );
}

function Field({ n, label, children }: { n: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="label-xs">
        <span className="text-signal">{n}</span> · {label}
      </span>
      {children}
    </div>
  );
}

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-[20px] leading-none transition-colors hover:border-border-hover hover:bg-card"
    >
      {children}
    </button>
  );
}

function Fact({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="label-xs">{k}</span>
      <span className="font-num text-[14px]">{v}</span>
    </div>
  );
}
