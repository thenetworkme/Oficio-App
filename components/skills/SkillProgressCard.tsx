import Link from "next/link";
import { Play } from "lucide-react";
import { formatInt, formatMinutes, formatPercent } from "@/lib/format";
import { nextMilestone } from "@/lib/milestones";
import { resolveSkillColor } from "@/lib/skill-color";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card } from "@/components/ui/card";
import type { Skill } from "@/lib/types";

export function SkillProgressCard({ skill, todayMinutes }: { skill: Skill; todayMinutes: number }) {
  const hours = skill.totalMinutes / 60;
  const pct = Math.min(100, (hours / skill.goalHours) * 100);
  const color = resolveSkillColor(skill.color);
  const next = nextMilestone(hours);
  const nextText = next
    ? `Próximo hito: ${formatInt(next)} h · faltan ${formatInt(Math.max(0, next - hours))} h`
    : "Maestría alcanzada";

  return (
    <Card className="flex flex-col gap-4.5 p-5.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="m-0 text-xl font-bold">
            <Link href={`/habilidades/${skill.id}`}>{skill.name}</Link>
          </h3>
          <span className="text-[13px] text-muted">Hoy: {todayMinutes === 0 ? "—" : formatMinutes(todayMinutes)}</span>
        </div>
        <span className="font-num rounded-full border border-line px-2.5 py-1 text-[13px]">
          {formatPercent((hours / skill.goalHours) * 100)}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <span className="font-num text-[34px] font-medium" style={{ color }}>
            {formatInt(hours)}
          </span>
          <span className="font-num text-sm text-muted">/ {formatInt(skill.goalHours)} h</span>
        </div>
        <ProgressBar pct={pct} color={color} ariaLabel={`${skill.name}: ${formatInt(hours)} de ${formatInt(skill.goalHours)} horas`} marks={[1, 10, 50]} />
        <span className="text-[13px] text-muted">{nextText}</span>
      </div>
      <Link
        href="/temporizador"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border border-line font-semibold"
      >
        <Play size={16} fill="currentColor" aria-hidden="true" />
        Practicar ahora
      </Link>
    </Card>
  );
}
