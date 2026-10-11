"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];
type Tab = "photos" | "compare" | "diary";

export default function RetoGaleriaPage() {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [days, setDays] = useState<ChallengeDay[]>([]);
  const [tab, setTab] = useState<Tab>("photos");
  const [week, setWeek] = useState(0); // 0 = all
  const [selectedPhotoDay, setSelectedPhotoDay] = useState<number | null>(null);
  const [compareDay, setCompareDay] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!id) return;
    return watchChallenge(id, setChallenge);
  }, [id]);
  useEffect(() => {
    if (!id) return;
    return watchChallengeDays(id, setDays);
  }, [id]);

  const photoEntries = useMemo(() => {
    const out: { dayNumber: number; url: string; date: string }[] = [];
    for (const d of days) {
      for (const url of d.photoUrls) out.push({ dayNumber: d.dayNumber, url, date: d.date });
    }
    return out.sort((a, b) => a.dayNumber - b.dayNumber);
  }, [days]);

  const weekOf = (dayNumber: number) => Math.floor((dayNumber - 1) / 7);
  const maxWeek = Math.max(0, ...days.map((d) => weekOf(d.dayNumber)));
  const weekFiltered = photoEntries.filter((p) => week === 0 || weekOf(p.dayNumber) === week - 1);

  const daysWithPhotos = Array.from(new Set(photoEntries.map((p) => p.dayNumber))).sort((a, b) => a - b);
  const selPhotoDayNum = selectedPhotoDay ?? daysWithPhotos[daysWithPhotos.length - 1] ?? null;
  const selPhotoDay = days.find((d) => d.dayNumber === selPhotoDayNum) ?? null;

  const daysWithEntries = days.filter((d) => d.durationMin > 0 || d.note).sort((a, b) => b.dayNumber - a.dayNumber);
  const ql = q.trim().toLowerCase();
  const matches = daysWithEntries.filter((d) => !ql || d.note.toLowerCase().includes(ql));
  const shown = matches.slice(0, 6);

  const firstDay = days.find((d) => d.dayNumber === 1) ?? null;
  const cmpCandidates = daysWithPhotos.filter((n) => n !== 1);
  const cmpDayNum = compareDay ?? cmpCandidates[cmpCandidates.length - 1] ?? null;
  const cmpDay = days.find((d) => d.dayNumber === cmpDayNum) ?? null;

  if (!challenge) return <p className="text-sm text-muted">Cargando galería…</p>;

  const totalMinUpTo = (upTo: number) => days.filter((d) => d.dayNumber <= upTo).reduce((a, d) => a + d.durationMin, 0);

  return (
    <>
      <nav aria-label="Ruta" className="flex flex-wrap items-center gap-2.5">
        <Link href="/retos" className="bx press flex min-h-11 items-center px-4 font-bold">
          ← Retos
        </Link>
        <span className="label-xs">Galería y diario</span>
      </nav>

      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="label-xs">{challenge.name}</span>
          <h1 className="m-0 mt-2 text-[48px] font-bold leading-[0.95] tracking-tight sm:text-[64px]">Tu progreso.</h1>
        </div>
        <div role="tablist" aria-label="Vista" className="flex flex-wrap gap-2.5">
          {([
            ["photos", "Fotos"],
            ["compare", "Día 1 vs hoy"],
            ["diary", "Diario"],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="press min-h-11 rounded-chip border-[3px] border-ink px-4.5 font-bold"
              style={tab === key ? { background: "var(--ink)", color: "var(--paper)" } : { background: "var(--card)" }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "photos" && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label-xs mr-1.5">Semana</span>
            {["Todas", ...Array.from({ length: maxWeek + 1 }, (_, i) => `Semana ${i + 1}`)].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={week === i}
                onClick={() => setWeek(i)}
                className="min-h-10 rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold"
                style={{ background: week === i ? "var(--a1)" : "var(--card)" }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-8">
            <div className="grid min-w-0 flex-[2_1_560px] grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5">
              {weekFiltered.length === 0 && <p className="text-sm text-muted">Todavía no hay fotos en esta semana.</p>}
              {weekFiltered.map((p, i) => (
                <button
                  key={`${p.dayNumber}-${i}`}
                  type="button"
                  aria-pressed={selPhotoDayNum === p.dayNumber}
                  onClick={() => setSelectedPhotoDay(p.dayNumber)}
                  className="hov bx flex flex-col gap-2 p-2.5 text-left"
                  style={selPhotoDayNum === p.dayNumber ? { boxShadow: "7px 7px 0 var(--shadow)" } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Foto del día ${p.dayNumber}`} className="h-[120px] w-full rounded-button border-[3px] border-ink object-cover" />
                  <div className="flex items-center justify-between">
                    <span className="label-xs text-[11px]">Día {p.dayNumber}</span>
                    <span className="font-num text-[11px] text-muted">{formatShortDateEs(new Date(`${p.date}T00:00:00`))}</span>
                  </div>
                </button>
              ))}
            </div>
            <aside aria-live="polite" className="bx flex min-w-0 flex-[1_1_320px] flex-col gap-2.5 p-5.5">
              {selPhotoDay ? (
                <>
                  <span className="label-xs">
                    Día {selPhotoDay.dayNumber} · {formatShortDateEs(new Date(`${selPhotoDay.date}T00:00:00`))}
                  </span>
                  <h3 className="m-0 text-2xl font-bold tracking-tight">
                    {formatMinutesLong(selPhotoDay.durationMin)} · {selPhotoDay.mood != null ? MOOD_LABELS[selPhotoDay.mood] : "Sin ánimo"}
                  </h3>
                  <p className="m-0 text-[17px] font-medium">{selPhotoDay.note}</p>
                </>
              ) : (
                <p className="text-sm text-muted">Elige una foto para ver sus detalles.</p>
              )}
            </aside>
          </div>
        </section>
      )}

      {tab === "compare" && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label-xs mr-1.5">Comparar día 1 con</span>
            {cmpCandidates.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={cmpDayNum === n}
                onClick={() => setCompareDay(n)}
                className="min-h-10 rounded-chip border-[3px] border-ink px-3.5 text-sm font-bold"
                style={{ background: cmpDayNum === n ? "var(--a1)" : "var(--card)" }}
              >
                Día {n}
              </button>
            ))}
            {cmpCandidates.length === 0 && <span className="text-sm text-muted">Todavía no hay otro día con foto para comparar.</span>}
          </div>
          <div className="flex flex-wrap items-stretch gap-7">
            <CompareCard label="Día 1" date={firstDay ? formatShortDateEs(new Date(`${firstDay.date}T00:00:00`)) : ""} photoUrl={firstDay?.photoUrls[0]} note={firstDay?.note || "Sin nota."} bg="var(--paper)" />
            <CompareCard
              label={`Día ${cmpDayNum ?? "?"}`}
              date={cmpDay ? formatShortDateEs(new Date(`${cmpDay.date}T00:00:00`)) : ""}
              photoUrl={cmpDay?.photoUrls[0]}
              note={cmpDay?.note || "Aún sin nota. Sube una foto para completar la comparación."}
              bg="var(--a1)"
            />
          </div>
          {cmpDayNum && (
            <div className="bx p-5 text-lg font-bold text-ink-solid" style={{ background: "var(--a3)" }}>
              Entre estos dos días acumulaste {formatMinutesLong(totalMinUpTo(cmpDayNum))} de práctica y {cmpDayNum - 1} días de camino.
            </div>
          )}
        </section>
      )}

      {tab === "diary" && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <label htmlFor="q" className="label-xs">
              Buscar en tus notas
            </label>
            <input
              id="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Prueba: técnica, metrónomo, canción…"
              className="box-border min-h-12 max-w-[420px] flex-1 rounded-button border-[3px] border-ink bg-card px-3.5 text-base text-ink placeholder:text-muted"
            />
            <span className="font-num text-[13px] text-muted">
              {matches.length} {matches.length === 1 ? "nota" : "notas"}
              {matches.length > 6 ? " · mostrando las 6 más recientes" : ""}
            </span>
          </div>
          {shown.map((d) => (
            <article key={d.id} className="bx flex flex-wrap items-center gap-5 p-5">
              <div
                className="font-num flex size-16.5 shrink-0 items-center justify-center rounded-button border-[3px] border-ink text-[26px] font-bold text-ink-solid"
                style={{ background: challenge.color }}
              >
                {d.dayNumber}
              </div>
              <div className="min-w-0 flex-1 basis-[380px]">
                <div className="flex flex-wrap gap-2.5">
                  <span className="label-xs">
                    Día {d.dayNumber} · {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
                  </span>
                  <span className="font-num text-xs text-muted">
                    {formatMinutesLong(d.durationMin)} · {d.mood != null ? MOOD_LABELS[d.mood] : "Sin ánimo"}
                  </span>
                </div>
                <p className="m-0 mt-1 text-[17px] font-medium">{d.note}</p>
              </div>
            </article>
          ))}
          {matches.length === 0 && (
            <div className="rounded-card border-[3px] border-dashed border-ink p-6.5 text-lg font-bold">
              Nada con esa palabra todavía. Prueba con otra.
            </div>
          )}
        </section>
      )}
    </>
  );
}

function CompareCard({ label, date, photoUrl, note, bg }: { label: string; date: string; photoUrl?: string; note: string; bg: string }) {
  return (
    <div className="bx flex min-w-0 flex-1 basis-[380px] flex-col gap-3 p-5.5" style={{ background: bg }}>
      <div className="flex justify-between">
        <span className="label-xs">{label}</span>
        <span className="font-num text-xs">{date}</span>
      </div>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={label} className="h-[260px] w-full rounded-button border-[3px] border-ink object-cover" />
      ) : (
        <div className="flex h-[260px] items-center justify-center rounded-button border-[3px] border-ink text-sm text-muted">Sin foto</div>
      )}
      <p className="m-0 text-[17px] font-medium">{note}</p>
    </div>
  );
}
