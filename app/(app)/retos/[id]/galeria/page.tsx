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

  const TABS: [Tab, string][] = [
    ["photos", "Fotos"],
    ["compare", "Día 1 vs hoy"],
    ["diary", "Diario"],
  ];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <Link href={`/retos/${challenge.id}`} className="label-xs mb-4.5 inline-block text-muted transition-colors hover:text-ink">
            ← {challenge.name}
          </Link>
          <span className="label-xs mb-3.5 block">Reto · {challenge.name}</span>
          <h1 className="m-0 text-[48px] font-light leading-[0.95] tracking-tight sm:text-[64px]">Galería y diario.</h1>
        </div>
        <div role="tablist" aria-label="Vista" className="flex flex-wrap gap-2.5">
          {TABS.map(([key, label]) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(key)}
                className="inline-flex min-h-10 items-center rounded-chip border px-4.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] transition-colors"
                style={selected ? { borderColor: "var(--ink)", background: "var(--ink)", color: "var(--paper)" } : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {tab === "photos" && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label-xs mr-1">Semana</span>
            {["Todas", ...Array.from({ length: maxWeek + 1 }, (_, i) => `Semana ${i + 1}`)].map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={week === i}
                onClick={() => setWeek(i)}
                className="min-h-9 rounded-chip border px-3.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors"
                style={week === i ? { borderColor: "var(--ink)", color: "var(--ink)" } : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {weekFiltered.length === 0 && <p className="text-sm text-muted">Todavía no hay fotos en esta semana.</p>}
              {weekFiltered.map((p, i) => (
                <button
                  key={`${p.dayNumber}-${i}`}
                  type="button"
                  aria-pressed={selPhotoDayNum === p.dayNumber}
                  onClick={() => setSelectedPhotoDay(p.dayNumber)}
                  className="flex flex-col gap-2 rounded-card border p-2 text-left transition-colors"
                  style={{ borderColor: selPhotoDayNum === p.dayNumber ? "var(--ink)" : "var(--line)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Foto del día ${p.dayNumber}`} className="h-[120px] w-full rounded-[14px] object-cover" />
                  <div className="flex items-center justify-between px-0.5 pb-0.5">
                    <span className="label-xs text-[10px]">Día {p.dayNumber}</span>
                    <span className="font-num text-[11px] text-muted">{formatShortDateEs(new Date(`${p.date}T00:00:00`))}</span>
                  </div>
                </button>
              ))}
            </div>
            <aside aria-live="polite" className="min-w-0 rounded-card border border-line p-5.5">
              {selPhotoDay ? (
                <>
                  <span className="label-xs">
                    Día {selPhotoDay.dayNumber} · {formatShortDateEs(new Date(`${selPhotoDay.date}T00:00:00`))}
                  </span>
                  <h3 className="m-0 mt-2 text-[22px] font-normal tracking-tight">
                    {formatMinutesLong(selPhotoDay.durationMin)} · {selPhotoDay.mood != null ? MOOD_LABELS[selPhotoDay.mood] : "Sin ánimo"}
                  </h3>
                  <p className="m-0 mt-2 text-[15px] text-muted">{selPhotoDay.note}</p>
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
            <span className="label-xs mr-1">Comparar día 1 con</span>
            {cmpCandidates.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={cmpDayNum === n}
                onClick={() => setCompareDay(n)}
                className="min-h-9 rounded-chip border px-3.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors"
                style={cmpDayNum === n ? { borderColor: "var(--ink)", color: "var(--ink)" } : { borderColor: "var(--border)", color: "var(--muted)" }}
              >
                Día {n}
              </button>
            ))}
            {cmpCandidates.length === 0 && <span className="text-sm text-muted">Todavía no hay otro día con foto para comparar.</span>}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <CompareCard label="Día 1" date={firstDay ? formatShortDateEs(new Date(`${firstDay.date}T00:00:00`)) : ""} photoUrl={firstDay?.photoUrls[0]} note={firstDay?.note || "Sin nota."} />
            <CompareCard
              label={`Día ${cmpDayNum ?? "?"}`}
              date={cmpDay ? formatShortDateEs(new Date(`${cmpDay.date}T00:00:00`)) : ""}
              photoUrl={cmpDay?.photoUrls[0]}
              note={cmpDay?.note || "Aún sin nota. Sube una foto para completar la comparación."}
              accent
            />
          </div>
          {cmpDayNum && (
            <div className="rounded-card border border-line p-5 text-[15px] text-ink">
              Entre estos dos días acumulaste <b>{formatMinutesLong(totalMinUpTo(cmpDayNum))}</b> de práctica y <b>{cmpDayNum - 1}</b> días de camino.
            </div>
          )}
        </section>
      )}

      {tab === "diary" && (
        <section className="flex flex-col gap-6">
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
              className="min-h-10 max-w-[420px] flex-1 border-0 border-b border-border bg-transparent px-0 pb-2.5 text-[16px] text-ink placeholder:text-muted focus:border-signal focus:outline-none"
            />
            <span className="font-num text-[13px] text-muted">
              {matches.length} {matches.length === 1 ? "nota" : "notas"}
              {matches.length > 6 ? " · mostrando las 6 más recientes" : ""}
            </span>
          </div>
          <div className="border-t border-line">
            {shown.map((d) => (
              <Link key={d.id} href={`/retos/${challenge.id}/dia?day=${d.dayNumber}`} className="flex flex-wrap items-start gap-5 border-b border-line py-5">
                <span className="font-num shrink-0 text-[22px] leading-none tracking-tight">D{d.dayNumber}</span>
                <span className="font-num w-[110px] shrink-0 text-[13px] leading-snug text-muted">
                  {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
                  <br />
                  {formatMinutesLong(d.durationMin)}
                </span>
                <span className="min-w-0 flex-1 text-[16px] text-ink/85">{d.note}</span>
              </Link>
            ))}
            {matches.length === 0 && (
              <p className="py-8 text-[16px] text-muted">Nada con esa palabra todavía. Prueba con otra.</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function CompareCard({ label, date, photoUrl, note, accent }: { label: string; date: string; photoUrl?: string; note: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border p-5.5" style={{ borderColor: accent ? "var(--signal)" : "var(--line)" }}>
      <div className="flex justify-between">
        <span className="label-xs">{label}</span>
        <span className="font-num text-[12px] text-muted">{date}</span>
      </div>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={label} className="h-[260px] w-full rounded-[14px] object-cover" />
      ) : (
        <div className="flex h-[260px] items-center justify-center rounded-[14px] border border-line text-sm text-muted">Sin foto</div>
      )}
      <p className="m-0 text-[15px] text-ink/85">{note}</p>
    </div>
  );
}
