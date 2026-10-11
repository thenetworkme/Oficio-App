import Link from "next/link";
import { formatInt } from "@/lib/format";
import { resolveSkillColor } from "@/lib/skill-color";
import { stickerRotationDeg } from "@/lib/sticker-rotation";
import type { Skill } from "@/lib/types";

/**
 * "Tu álbum de sellos" (PegatinaPanel.dc.html): one stamp per 100 hours
 * practiced, shown as a 20x5 grid (100 cells) that fills up as the skill's
 * total hours grow. Replaces the old SkillProgressCard.
 *
 * The mockup also shows a "Nv. X" tag per skill card that doesn't match any
 * derivable formula from the sample data (e.g. 312h tagged "Nv. 7" while
 * 1284h is "Nv. 12" — not a consistent curve), so rather than fabricate a
 * per-skill leveling system (separate from the pet's XP-based level), this
 * shows the actual stamp count instead, which is real, derived data.
 */
export function StampAlbumCard({ skill }: { skill: Skill }) {
  const hours = skill.totalMinutes / 60;
  const stamps = Math.floor(hours / 100);
  const left = Math.max(0, skill.goalHours - hours);
  const color = resolveSkillColor(skill.color);
  const cells = Array.from({ length: 100 }, (_, i) => {
    if (i < stamps) return "var(--ink)";
    if (i === stamps) return "rgba(17,17,17,.35)";
    return "var(--card)";
  });

  return (
    <Link
      href={`/habilidades/${skill.id}`}
      className="bx hov flex min-w-0 flex-1 basis-[250px] flex-col gap-3.5 p-6 text-ink"
      style={{ background: color, "--sticker-rot": stickerRotationDeg(skill.id), "--r": stickerRotationDeg(skill.id) } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 text-[26px] font-bold tracking-tight">{skill.name}</h3>
        <span className="font-num shrink-0 whitespace-nowrap rounded-chip bg-ink px-2.5 py-0.5 text-[13px] font-bold" style={{ color }}>
          {stamps} {stamps === 1 ? "sello" : "sellos"}
        </span>
      </div>
      <div className="font-num text-[56px] font-bold leading-none tracking-tight">
        {formatInt(hours)}
        <span className="text-xl"> h</span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-[repeat(20,1fr)] gap-[3px]">
        {cells.map((bg, i) => (
          <span key={i} className="aspect-square rounded-[2px] border-2 border-ink" style={{ background: bg }} />
        ))}
      </div>
      <span className="label-xs font-bold text-ink">
        {stamps} de 100 sellos · faltan {formatInt(left)} h
      </span>
    </Link>
  );
}
