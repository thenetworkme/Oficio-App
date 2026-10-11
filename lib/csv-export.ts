import { formatDateEs } from "@/lib/format";
import { listAchievementsForUser } from "@/lib/firestore/achievements";
import { listReminders } from "@/lib/firestore/reminders";
import { listAllSessions } from "@/lib/firestore/sessions";
import { listSkills } from "@/lib/firestore/skills";
import type { Achievement, PracticeSession, Reminder, Skill } from "@/lib/types";

function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function skillsCsv(skills: Skill[]): string {
  return toCsv(
    ["id", "nombre", "color", "meta_horas", "horas_iniciales", "meta_diaria_min", "dias_por_semana", "total_horas", "creada_el"],
    skills.map((s) => [
      s.id,
      s.name,
      s.color,
      s.goalHours,
      s.initialHours,
      s.dailyGoalMin,
      s.daysPerWeek,
      (s.totalMinutes / 60).toFixed(2),
      formatDateEs(new Date(s.createdAt)),
    ]),
  );
}

const SESSION_SOURCE_LABEL: Record<PracticeSession["source"], string> = {
  timer: "temporizador",
  manual: "manual",
  challenge: "reto",
  stopwatch: "libre",
};

function sessionsCsv(sessions: PracticeSession[], skillNameById: Map<string, string>): string {
  return toCsv(
    ["id", "habilidad", "inicio", "duracion_min", "calidad", "nota", "pomodoros", "origen"],
    sessions.map((s) => [
      s.id,
      skillNameById.get(s.skillId) ?? s.skillId,
      new Date(s.startedAt).toISOString(),
      s.durationMin,
      s.quality,
      s.note,
      s.pomodoros,
      SESSION_SOURCE_LABEL[s.source] ?? s.source,
    ]),
  );
}

function achievementsCsv(items: Achievement[], skillNameById: Map<string, string>): string {
  return toCsv(
    ["habilidad", "horas", "logrado_el"],
    items.map((a) => [skillNameById.get(a.skillId) ?? a.skillId, a.hours, formatDateEs(new Date(a.achievedAt))]),
  );
}

function remindersCsv(items: Reminder[], skillNameById: Map<string, string>): string {
  const kindLabel: Record<Reminder["kind"], string> = {
    practice: "práctica",
    streak_guard: "protección de racha",
    weekly_review: "revisión semanal",
  };
  return toCsv(
    ["tipo", "habilidad", "hora", "dias", "activo", "mensaje"],
    items.map((r) => [
      kindLabel[r.kind],
      r.skillId ? (skillNameById.get(r.skillId) ?? r.skillId) : "Todas",
      r.timeOfDay,
      r.days.join(" "),
      r.enabled ? "si" : "no",
      r.message,
    ]),
  );
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fetches every record the user owns and triggers one CSV download per entity. */
export async function exportUserDataToCsv(uid: string): Promise<void> {
  const [skills, sessions, achievements, reminders] = await Promise.all([
    listSkills(uid, true),
    listAllSessions(uid),
    listAchievementsForUser(uid),
    listReminders(uid),
  ]);
  const skillNameById = new Map(skills.map((s) => [s.id, s.name]));

  const files: [string, string][] = [
    ["oficio-habilidades.csv", skillsCsv(skills)],
    ["oficio-sesiones.csv", sessionsCsv(sessions, skillNameById)],
    ["oficio-logros.csv", achievementsCsv(achievements, skillNameById)],
    ["oficio-recordatorios.csv", remindersCsv(reminders, skillNameById)],
  ];

  for (const [filename, content] of files) {
    downloadCsv(filename, content);
    // Small gap so the browser treats each as a distinct, user-initiated download.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}
