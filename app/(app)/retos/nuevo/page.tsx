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
import { canStartNewChallenge, createChallenge } from "@/lib/firestore/challenges";
import { createSkill } from "@/lib/firestore/skills";
import { formatDateEs, formatMinutesLong } from "@/lib/format";
import { percentOfTenThousandHours, projectedEndDate } from "@/lib/challenge";
import { dateKeyInTz } from "@/lib/tz";
import { CHALLENGE_COLORS, MAX_ACTIVE_CHALLENGES } from "@/lib/types";

const DURATIONS = [7, 14, 21, 30, 60, 100];
const GOALS = [15, 30, 45, 60, 90];
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
      router.push(`/retos/${challengeId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2.5">
        <Link href="/retos" className="bx press flex min-h-11 items-center px-4 font-bold">
          ← Retos
        </Link>
        <span className="label-xs">Nuevo reto</span>
      </nav>
      <h1 className="m-0 text-[48px] font-bold leading-[0.95] tracking-tight sm:text-[64px]">Crea tu reto.</h1>

      <section className="flex flex-wrap items-start gap-8">
        <form onSubmit={(e) => e.preventDefault()} className="bx flex min-w-0 flex-[2_1_560px] flex-col gap-6.5 p-7.5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rn">Nombre del reto</Label>
            <Input id="rn" value={name} onChange={(e) => setName(e.target.value)} className="text-xl font-bold" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="label-xs">Habilidad vinculada</span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <Chip key={s.id} pressed={skillIdx === i} onClick={() => setSkillIdx(i)} style={skillIdx === i ? { background: color } : undefined}>
                  {s.name}
                </Chip>
              ))}
              <Chip pressed={isNewSkill} onClick={() => setSkillIdx(skills.length)} style={isNewSkill ? { background: color } : undefined}>
                Nueva habilidad
              </Chip>
            </div>
            {isNewSkill ? (
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Nombre de la nueva habilidad"
                className="mt-1 max-w-xs"
              />
            ) : null}
            <span className="font-num text-[13px] text-muted">
              {isNewSkill ? "Crearemos una habilidad nueva con tu reto." : `Las horas del reto suman a las 10.000 h de ${linkedSkillName}.`}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label-xs">Duración</span>
            <div className="flex flex-wrap items-center gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  pressed={days === d}
                  onClick={() => {
                    setDays(d);
                    setCustomDays(String(d));
                  }}
                  style={days === d ? { background: color } : undefined}
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
                className="w-24"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label-xs">Meta diaria</span>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((m) => (
                <Chip key={m} pressed={goalMin === m} onClick={() => setGoalMin(m)} style={goalMin === m ? { background: color } : undefined}>
                  {m} min
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-7">
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <span className="label-xs">Días de gracia</span>
              <div className="flex gap-2">
                {GRACE_OPTIONS.map((g) => (
                  <Chip key={g} pressed={grace === g} onClick={() => setGrace(g)} style={grace === g ? { background: color } : undefined}>
                    {g}
                  </Chip>
                ))}
              </div>
              <span className="font-num text-[13px] text-muted">Fallas permitidas sin romper la racha.</span>
            </div>
            <div className="flex min-w-[240px] flex-1 flex-col gap-2">
              <span className="label-xs">Empieza</span>
              <div className="flex gap-2">
                {START_OPTIONS.map((label, i) => (
                  <Chip key={label} pressed={startIdx === i} onClick={() => setStartIdx(i)} style={startIdx === i ? { background: color } : undefined}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rt">Hora del recordatorio</Label>
              <Input id="rt" type="time" value={remindTime} onChange={(e) => setRemindTime(e.target.value)} className="w-[170px]" />
            </div>
            <div className="flex min-h-12 items-center gap-3">
              <Switch checked={remind} onCheckedChange={setRemind} label="Recordarme cada día" />
              <span className="font-bold">Recordarme cada día</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="label-xs">Color</span>
            <div className="flex gap-3">
              {CHALLENGE_COLORS.map((hex, i) => (
                <button
                  key={hex}
                  type="button"
                  aria-pressed={colorIdx === i}
                  aria-label={COLOR_NAMES[i]}
                  onClick={() => setColorIdx(i)}
                  className="bx size-12 p-0"
                  style={{ background: hex, boxShadow: colorIdx === i ? "5px 5px 0 var(--shadow)" : "none" }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="why">Mi porqué</Label>
            <textarea
              id="why"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="¿Por qué quieres lograr este reto?"
              className="box-border w-full resize-y rounded-button border-[3px] border-ink bg-card px-3.5 py-3 text-base leading-snug text-ink placeholder:text-muted"
            />
            <span className="font-num text-[13px] text-muted">Se lo recordarás a tu yo del día 15, cuando cueste.</span>
          </div>

          {error && (
            <div className="bx p-4 text-sm font-semibold text-danger" style={{ background: "var(--card)" }}>
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/retos" className="bx press flex min-h-12 items-center px-5 font-bold">
              Cancelar
            </Link>
            <Button onClick={handleCreate} disabled={creating} style={{ background: color }} size="default">
              {creating ? "Creando…" : "Empezar reto"}
            </Button>
          </div>
        </form>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6.5">
          <div className="bx p-6.5 text-ink-solid" style={{ background: color, transform: "rotate(1.5deg)" }}>
            <span className="label-xs !text-ink-solid opacity-80">Tu reto en números</span>
            <div className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight">{name || "Tu reto"}</div>
            <div className="font-num mt-1 text-[52px] font-bold leading-[1.05]">{formatMinutesLong(totalMin)}</div>
            <span className="font-num text-[13px]">
              {days} días × {goalMin} min
            </span>
          </div>
          <div className="bx flex flex-col gap-2.5 p-5.5">
            <Fact k="Empieza" v={formatDateEs(startDate)} />
            <Fact k="Termina" v={formatDateEs(endDate)} />
            <Fact k="Aporta" v={`${pctOf10k < 0.1 ? "< 0,1" : pctOf10k.toFixed(2).replace(".", ",")} % de las 10.000 h`} />
            <Fact k="Aviso" v={remind ? `Cada día a las ${remindTime}` : "Sin aviso"} last />
          </div>
          <div className="bx p-4.5" style={{ background: "var(--paper)" }}>
            {goalMin >= 60
              ? `Ojo: ${goalMin} min al día es mucho para un reto de ${days} días. Mejor una meta que cumplas incluso en un mal día.`
              : "Buen ritmo. Un reto corto y constante gana a uno heroico que abandonas en la primera semana."}
          </div>
        </aside>
      </section>
    </>
  );
}

function Fact({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 font-bold ${last ? "" : "border-b-[3px] border-dashed border-ink pb-2"}`}>
      <span className="font-num">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
