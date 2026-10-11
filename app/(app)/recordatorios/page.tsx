"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAppData } from "@/lib/hooks/useAppData";
import { createReminder, setReminderEnabled, watchReminders } from "@/lib/firestore/reminders";
import { savePushSubscription } from "@/lib/push/subscribe";
import type { Reminder } from "@/lib/types";

const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function describeReminder(r: Reminder, skillName: string | undefined): { title: string; meta: string } {
  const title = r.message || (r.kind === "streak_guard" ? "Protección de racha" : r.kind === "weekly_review" ? "Revisión semanal de horas" : `Práctica de ${skillName ?? "habilidad"}`);
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

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Recordatorios</span>
        <h1 className="m-0 text-4xl font-bold leading-tight tracking-tight">La disciplina se agenda.</h1>
      </header>

      {notifStatus !== "granted" && notifStatus !== "unsupported" && (
        <div className="flex flex-wrap items-center justify-between gap-4 bx rounded-[14px] px-5 py-4">
          <span className="flex-1 min-w-[280px]">
            Permite las notificaciones para que los avisos lleguen aunque cierres la pestaña.
          </span>
          <Button onClick={handleEnableNotifications}>Activar notificaciones</Button>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-list" className="min-w-0 flex-[3_1_460px] bx p-5.5">
          <h2 id="h-list" className="m-0 mb-2.5 text-lg font-bold">
            Mis recordatorios
          </h2>
          {reminders.length === 0 ? (
            <p className="py-4 text-sm text-muted">Aún no tienes recordatorios. Crea el primero a la derecha.</p>
          ) : (
            reminders.map((r) => {
              const skill = skills.find((s) => s.id === r.skillId);
              const { title, meta } = describeReminder(r, skill?.name);
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-4 border-t border-ink py-4">
                  <span className="font-num min-w-[76px] text-base font-medium" style={{ color: r.enabled ? "var(--a1)" : "var(--muted)" }}>
                    {r.timeOfDay}
                  </span>
                  <div className="min-w-[200px] flex-1 flex flex-col gap-0.5">
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
        </section>

        <aside className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <form onSubmit={handleCreate} className="flex flex-col gap-4.5 bx p-5.5">
            <h2 className="m-0 text-lg font-bold">Nuevo recordatorio</h2>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-skill">Habilidad</Label>
                <select
                  id="f-skill"
                  value={selectedSkillId}
                  onChange={(e) => setSkillId(e.target.value)}
                  className="box-border min-h-[46px] w-full rounded-button border-[3px] border-ink bg-card px-3 text-[15px]"
                >
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="f-time">Hora</Label>
                <Input id="f-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="font-num" />
              </div>
            </div>

            <div role="group" aria-label="Días" className="flex flex-col gap-2">
              <span className="text-[13px] text-muted">Se repite</span>
              <div className="flex flex-wrap gap-2">
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
                      className="font-num flex size-11 items-center justify-center rounded-full border font-bold"
                      style={{
                        borderColor: on ? "var(--a1)" : "var(--ink)",
                        background: on ? "var(--a1)" : "transparent",
                        color: on ? "var(--ink-solid)" : "var(--ink)",
                      }}
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
              Guardar recordatorio
            </Button>
          </form>

          <Card className="flex flex-col gap-1.5 p-5">
            <h2 className="m-0 text-base font-bold">Protección de racha</h2>
            <p className="m-0 text-sm text-muted">
              Si a las 8:00 pm todavía no llegas a tu mínimo diario, te avisamos con tiempo para salvar tu racha.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
