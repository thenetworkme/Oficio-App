import Link from "next/link";
import { Card, CardHeading } from "@/components/ui/card";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatDecimal } from "@/lib/format";
import { recentWeeklyPace, projectTenThousandHours } from "@/lib/projection";
import type { PracticeSession, Skill } from "@/lib/types";

/**
 * "At this pace you'll reach 10,000 hours in X" — one row per skill, using
 * each skill's actual logged pace over the trailing 90 days (lib/projection
 * .recentWeeklyPace), not its configured daily goal. Lives on the main
 * dashboard per the brief; the goal-pace projection on Estadísticas is a
 * separate, intentionally different number (see that page).
 */
export function TenThousandProjectionCard({ skills, sessions }: { skills: Skill[]; sessions: PracticeSession[] }) {
  if (skills.length === 0) return null;

  return (
    <Card className="flex flex-col gap-1 p-6">
      <CardHeading>Camino a las 10,000 horas</CardHeading>
      {skills.map((skill, i) => {
        const totalHours = skill.totalMinutes / 60;
        const weeklyHours = recentWeeklyPace(sessions, skill.id);
        const projection = projectTenThousandHours(totalHours, weeklyHours);
        const color = resolveSkillColor(skill.color);
        return (
          <Link
            key={skill.id}
            href={`/habilidades/${skill.id}`}
            className={`flex flex-wrap items-center gap-3 border-dashed border-ink py-3 ${i === 0 ? "" : "border-t-2"}`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-bold">{skill.name}</span>
              <span className="text-[13px] text-muted">{projection.message}</span>
            </div>
            {projection.status === "projected" && (
              <span className="font-num shrink-0 text-xs text-muted">{formatDecimal(weeklyHours)} h/sem</span>
            )}
          </Link>
        );
      })}
    </Card>
  );
}
