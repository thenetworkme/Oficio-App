"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { useAppData } from "@/lib/hooks/useAppData";
import { createReminder, deleteReminder, setReminderEnabled, watchReminders } from "@/lib/firestore/reminders";
import { savePushSubscription } from "@/lib/push/subscribe";
import { formatShortDateEs } from "@/lib/format";
import type { Reminder } from "@/lib/types";

const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SYSTEM_REMINDER_COPY: Record<string, { title: string; desc: string }> = {
  streak_guard: { title: "Racha en riesgo", desc: "Aviso si aún no practicas hoy, a tiempo para salvar tu racha." },
  weekly_review: { title: "Resumen semanal", desc: "Tus horas y logros de la semana, un día fijo." },
};

function describeReminder(r: Reminder, skillName: string | undefined): { title: string; meta: string } {
  const title = r.message || `Práctica de ${skillName ?? "habilidad"}`;
  if (r.days.length === 7) return { title, meta: "Todos los días" };
  if (r.days.length === 5 && r.days.every((d) => d <= 5)) return { title, meta: "Lunes a viernes" };
  return { title, meta: r.days.map((d) => DAY_FULL[d - 1]).join(", ") };
}

/** Soonest future occurrence of an enabled reminder (within the next 8 days),
 * for the "Próximo aviso" summary card — purely presentational derived data
 * over already-fetched reminders, no new persisted state. */
function nextOccurrence(r: Reminder, now: Date): Date | null {
  const [hh, mm] = r.timeOfDay.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    const isoDow = d.getDay() === 0 ? 7 : d.getDay();
    if (!r.days.includes(isoDow)) continue;
    if (d.getTime() <= now.getTime()) continue;
    return d;
  }
  return null;
}

function relativeDayLabel(d: Date, now: Date): string {
  if (d.toDateString() === now.toDateString()) return "Hoy";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Mañana";
  return formatShortDateEs(d);
}

export default function RecordatoriosPage() {
  const { user, skills } = useAppData();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">("default");
  const [formOpen, setFormOpen] = useState(false);

  const [skillId, setSkillId] = useState<string>("");
  const selectedSkillId = skillId || skills[0]?.id || "";
  const [time, setTime] = useState("19:00");
  const [days, setDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchReminders(user.uid, setReminders);
  }, [user]);

  // Reads the current permission from the Notification API on mount; there
  // is no subscription to hang this off, so a direct setState is the sync.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleEnableNotifications() {
    if (!user) return;
    try {
      const permission = await Notification.requestPermission();
      setNotifStatus(permission);
      if (permission === "granted") {
        await savePushSubscription(user.uid);
      }
    } catch {
      // Permission dialog dismissed or push unsupported; status stays as-is.
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedSkillId) return;
    setSaving(true);
    try {
      const skill = skills.find((s) => s.id === selectedSkillId);
      await createReminder({
        userId: user.uid,
        skillId: selectedSkillId,
        kind: "practice",
        timeOfDay: time,
        days: Array.from(days).sort(),
        message: message || `Hora de practicar ${skill?.name ?? ""}`.trim(),
        enabled: true,
      });
      setFormOpen(false);
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(d: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  const practiceReminders = reminders.filter((r) => r.kind === "practice");
  const systemReminders = reminders.filter((r) => r.kind !== "practice");
  const activeCount = reminders.filter((r) => r.enabled).length + (notifStatus === "granted" ? 1 : 0);

  const nextUp = useMemo(() => {
    const now = new Date();
    let best: { at: Date; reminder: Reminder } | null = null;
    for (const r of practiceReminders) {
      if (!r.enabled) continue;
      const at = nextOccurrence(r, now);
      if (at && (!best || at.getTime() < best.at.getTime())) best = { at, reminder: r };
    }
    if (!best) return null;
    const skill = skills.find((s) => s.id === best!.reminder.skillId);
    return { label: `${relativeDayLabel(best.at, now)} · ${best.reminder.timeOfDay} · ${skill?.name ?? "Práctica"}` };
  }, [practiceReminders, skills]);

  return (
    <>
      <ModeBackdrop />

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="label-xs text-mode-ink-muted">Recordatorios</span>
          <h1 className="m-0 text-[44px] font-light leading-[0.95] tracking-tight text-mode-ink sm:text-[56px]">Avisos</h1>
          <p className="m-0 text-mode-ink-muted">Un empujón amable a la hora que tú elijas.</p>
        </div>
        <span className="label-xs text-mode-ink-muted">{activeCount} activos</span>
      </header>

      <Card tone="tint" className="flex items-center gap-4 p-4.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card-tint">
          <Bell size={20} aria-hidden="true" />
        </span>
        <div>
          <div className="text-[13px] opacity-80">Próximo aviso</div>
          <div className="text-[18px] font-bold">{nextUp ? nextUp.label : "No tienes avisos activos"}</div>
        </div>
      </Card>

      <Card tone="solid" className="flex flex-col p-5 sm:p-6">
        <CardHeading className="mb-1 px-1 text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Tus avisos</CardHeading>
        {practiceReminders.length === 0 ? (
          <p className="px-1 py-5 text-center text-card-solid-muted">No tienes avisos. Añade el primero.</p>
        ) : (
          practiceReminders.map((r) => {
            const skill = skills.find((s) => s.id === r.skillId);
            const { title, meta } = describeReminder(r, skill?.name);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-card-solid-line py-4 first:border-t-0">
                <span className="font-num min-w-[84px] text-[26px] font-bold" style={{ color: r.enabled ? "var(--mode-bg)" : "var(--card-solid-line)" }}>
                  {r.timeOfDay}
                </span>
                <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: r.enabled ? undefined : "var(--card-solid-muted)" }}>
                    {title}
                  </span>
                  <span className="text-[13.5px] text-card-solid-muted">{meta}</span>
                </div>
                <Switch checked={r.enabled} onCheckedChange={(v) => setReminderEnabled(r.id, v)} label={title} />
                <button
                  type="button"
                  aria-label="Eliminar aviso"
                  onClick={() => deleteReminder(r.id)}
                  className="flex size-8 items-center justify-center rounded-[4px] text-card-solid-line transition-colors hover:text-danger"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}

        <div className="pt-4">
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-card-solid-line font-semibold text-card-solid-muted transition-colors hover:border-card-solid-muted"
            >
              <Plus size={18} aria-hidden="true" />
              Añadir aviso
            </button>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-card bg-surface-muted p-4.5">
              <div className="grid grid-cols-[150px_1fr] gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-card-solid-muted">Hora</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-num bg-card-solid text-card-solid-ink" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-card-solid-muted">Habilidad</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <Chip key={s.id} pressed={selectedSkillId === s.id} onClick={() => setSkillId(s.id)}>
                        {s.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-card-solid-muted">Días</Label>
                <div className="flex gap-1.5">
                  {DAY_SHORT.map((label, i) => {
                    const d = i + 1;
                    const on = days.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        aria-label={DAY_FULL[i]}
                        onClick={() => toggleDay(d)}
                        className={
                          "font-num flex size-9 items-center justify-center rounded-full text-[12px] font-semibold transition-colors " +
                          (on ? "bg-flat-dark text-flat-dark-ink" : "bg-surface-muted-hover text-surface-muted-ink")
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-card-solid-muted">Mensaje (opcional)</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hora de tu bloque de práctica" className="bg-card-solid text-card-solid-ink" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="light" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="dark" disabled={saving || !selectedSkillId}>
                  Guardar
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card tone="solid" className="flex flex-col p-5 sm:p-6">
        <CardHeading className="mb-1 px-1 text-[14px] font-bold uppercase tracking-tight text-card-solid-muted">Avisos del sistema</CardHeading>
        {systemReminders.map((r) => {
          const copy = SYSTEM_REMINDER_COPY[r.kind] ?? { title: r.message || r.kind, desc: "" };
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-card-solid-line py-4 first:border-t-0">
              <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                <span className="font-semibold">{copy.title}</span>
                {copy.desc && <span className="text-[13px] text-card-solid-muted">{copy.desc}</span>}
              </div>
              <Switch checked={r.enabled} onCheckedChange={(v) => setReminderEnabled(r.id, v)} label={copy.title} />
            </div>
          );
        })}
        {notifStatus !== "unsupported" && (
          <div className="flex flex-wrap items-center gap-4 border-t border-card-solid-line py-4">
            <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
              <span className="font-semibold">Notificaciones del navegador</span>
              <span className="text-[13px] text-card-solid-muted">Aunque Oficio esté cerrado</span>
            </div>
            {notifStatus === "granted" ? (
              <Switch checked onCheckedChange={() => {}} label="Notificaciones del navegador" />
            ) : (
              <Button size="sm" variant="light" onClick={handleEnableNotifications}>
                Activar
              </Button>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
