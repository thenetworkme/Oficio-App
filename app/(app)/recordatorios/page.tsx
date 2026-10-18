"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAppData } from "@/lib/hooks/useAppData";
import { createReminder, setReminderEnabled, watchReminders } from "@/lib/firestore/reminders";
import { savePushSubscription } from "@/lib/push/subscribe";
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

export default function RecordatoriosPage() {
  const { user, skills } = useAppData();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">("default");

  const [skillId, setSkillId] = useState<string>("");
  const selectedSkillId = skillId || skills[0]?.id || "";
  const [time, setTime] = useState("19:00");
  const [days, setDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [message, setMessage] = useState("Hora de tu bloque de práctica");
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
      await createReminder({
        userId: user.uid,
        skillId: selectedSkillId,
        kind: "practice",
        timeOfDay: time,
        days: Array.from(days).sort(),
        message,
        enabled: true,
      });
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

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="label-xs">Recordatorios</span>
          <h1 className="m-0 text-[52px] font-light leading-[0.95] tracking-tight sm:text-[68px]">Avisos</h1>
        </div>
        <span className="label-xs">{activeCount} activos</span>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-list" className="flex min-w-0 flex-[3_1_460px] flex-col gap-8">
          <div>
            <h2 id="h-list" className="label-xs m-0 mb-1">
              Tus avisos
            </h2>
            {practiceReminders.length === 0 ? (
              <p className="py-4 text-sm text-muted">Aún no tienes recordatorios de práctica. Crea el primero a la derecha.</p>
            ) : (
              practiceReminders.map((r) => {
                const skill = skills.find((s) => s.id === r.skillId);
                const { title, meta } = describeReminder(r, skill?.name);
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-line py-4">
                    <span className="font-num min-w-[76px] text-lg font-medium" style={{ color: r.enabled ? "var(--signal)" : "var(--muted)" }}>
                      {r.timeOfDay}
                    </span>
                    <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                      <span className="font-semibold" style={{ color: r.enabled ? "var(--ink)" : "var(--muted)" }}>
                        {title}
                      </span>
                      <span className="text-[13px] text-muted">{meta}</span>
                    </div>
                    <Switch checked={r.enabled} onCheckedChange={(v) => setReminderEnabled(r.id, v)} label={title} />
                  </div>
                );
              })
            )}
          </div>

          <div>
            <h2 className="label-xs m-0 mb-1">Avisos del sistema</h2>
            {systemReminders.map((r) => {
              const copy = SYSTEM_REMINDER_COPY[r.kind] ?? { title: r.message || r.kind, desc: "" };
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-line py-4">
                  <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                    <span className="font-semibold">{copy.title}</span>
                    {copy.desc && <span className="text-[13px] text-muted">{copy.desc}</span>}
                  </div>
                  <Switch checked={r.enabled} onCheckedChange={(v) => setReminderEnabled(r.id, v)} label={copy.title} />
                </div>
              );
            })}
            {notifStatus !== "unsupported" && (
              <div className="flex flex-wrap items-center gap-4 border-t border-line py-4">
                <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                  <span className="font-semibold">Notificaciones del navegador</span>
                  <span className="text-[13px] text-muted">Permite avisos aunque cierres la pestaña</span>
                </div>
                {notifStatus === "granted" ? (
                  <Switch checked onCheckedChange={() => {}} label="Notificaciones del navegador" />
                ) : (
                  <Button size="sm" variant="outline" onClick={handleEnableNotifications}>
                    Activar
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 border-t border-line pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <form onSubmit={handleCreate} className="flex flex-col gap-6.5">
            <h2 className="label-xs m-0">Nuevo aviso</h2>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-time">Hora</Label>
              <Input id="f-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-num text-[32px]" />
            </div>

            <div role="group" aria-label="Habilidad" className="flex flex-col gap-2.5">
              <span className="label-xs">Habilidad</span>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Chip key={s.id} pressed={selectedSkillId === s.id} onClick={() => setSkillId(s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div role="group" aria-label="Días" className="flex flex-col gap-2.5">
              <span className="label-xs">Días</span>
              <div className="flex flex-wrap gap-1.5">
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
                      className="font-num flex size-9 items-center justify-center rounded-full border text-[11px] font-medium transition-colors"
                      style={
                        on
                          ? { borderColor: "var(--signal)", background: "var(--signal)", color: "var(--ink-solid)" }
                          : { borderColor: "var(--border)", color: "var(--ink)" }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="f-msg">Mensaje</Label>
              <Input id="f-msg" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            <Button type="submit" disabled={saving || !selectedSkillId} className="w-full">
              Crear aviso
            </Button>
          </form>
        </aside>
      </div>
    </>
  );
}
