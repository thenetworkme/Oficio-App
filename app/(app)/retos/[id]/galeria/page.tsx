"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ModeBackdrop } from "@/components/layout/ModeBackdrop";
import { watchChallenge, watchChallengeDays } from "@/lib/firestore/challenges";
import { formatMinutesLong, formatShortDateEs } from "@/lib/format";
import type { Challenge, ChallengeDay } from "@/lib/types";

const MOOD_LABELS = ["", "Mal día", "Regular", "Bien", "Muy bien", "¡Genial!"];
type Tab = "photos" | "compare" | "diary";

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function OnColorTab({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className="min-h-9 rounded-[4px] border-0 bg-transparent px-3.5 text-[14px] transition-colors"
      style={{ background: selected ? "rgb(0 0 0 / 15%)" : "transparent", fontWeight: selected ? 600 : 400, color: "var(--mode-ink)", opacity: selected ? 1 : 0.88 }}
    >
      {children}
    </button>
  );
}

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

  const totalMinUpTo = (upTo: number) => days.filter((d) => d.dayNumber <= upTo).reduce((a, d) => a + d.durationMin, 0);

  if (!challenge) {
    return (
      <>
        <ModeBackdrop />
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="text-[15px] text-mode-ink-muted">Cargando galería…</span>
        </div>
      </>
    );
  }

  const TABS: [Tab, string][] = [
    ["photos", "Fotos"],
    ["compare", "Día 1 vs hoy"],
    ["diary", "Diario"],
  ];

  return (
    <>
      <ModeBackdrop />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 text-mode-ink">
        <div>
          <Link href={`/retos/${challenge.id}`} className="mb-2 inline-flex items-center gap-1 text-[14px]" style={{ color: "var(--mode-ink-muted)" }}>
            <ChevronLeft />
            {challenge.name}
          </Link>
          <h1 className="m-0 text-[30px] font-bold leading-[1.15] tracking-tight">Galería</h1>
          <p className="m-0 mt-1 text-[15px]" style={{ color: "var(--mode-ink-muted)" }}>
            Tus notas y grabaciones, día por día.
          </p>
        </div>

        <div role="tablist" aria-label="Vista" className="flex flex-wrap gap-1">
          {TABS.map(([key, label]) => (
            <OnColorTab key={key} selected={tab === key} onClick={() => setTab(key)}>
              {label}
            </OnColorTab>
          ))}
        </div>

        {tab === "photos" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1">
              {["Todas", ...Array.from({ length: maxWeek + 1 }, (_, i) => `Semana ${i + 1}`)].map((label, i) => (
                <OnColorTab key={label} selected={week === i} onClick={() => setWeek(i)}>
                  {label}
                </OnColorTab>
              ))}
            </div>

            {weekFiltered.length === 0 ? (
              <Card tone="tint" className="p-6 text-[15px]">
                Todavía no hay fotos en esta semana.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                  {weekFiltered.map((p, i) => (
                    <button
                      key={`${p.dayNumber}-${i}`}
                      type="button"
                      aria-pressed={selPhotoDayNum === p.dayNumber}
                      onClick={() => setSelectedPhotoDay(p.dayNumber)}
                      className="block overflow-hidden rounded-card text-left"
                      style={{ boxShadow: selPhotoDayNum === p.dayNumber ? "0 0 0 2.5px var(--mode-bg)" : "none" }}
                    >
                      <Card tone="solid" className="p-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Foto del día ${p.dayNumber}`} className="h-[100px] w-full object-cover" />
                        <div className="flex items-center justify-between px-2.5 py-2">
                          <span className="text-[12px] font-bold" style={{ color: "var(--card-solid-ink)" }}>
                            Día {p.dayNumber}
                          </span>
                          <span className="font-num text-[11px]" style={{ color: "var(--card-solid-muted)" }}>
                            {formatShortDateEs(new Date(`${p.date}T00:00:00`))}
                          </span>
                        </div>
                      </Card>
                    </button>
                  ))}
                </div>
                <Card tone="solid" aria-live="polite" className="min-w-0 p-5">
                  {selPhotoDay ? (
                    <>
                      <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--card-solid-muted)" }}>
                        Día {selPhotoDay.dayNumber} · {formatShortDateEs(new Date(`${selPhotoDay.date}T00:00:00`))}
                      </div>
                      <div className="mt-1.5 text-[17px] font-bold" style={{ color: "var(--card-solid-ink)" }}>
                        {formatMinutesLong(selPhotoDay.durationMin)} · {selPhotoDay.mood != null ? MOOD_LABELS[selPhotoDay.mood] : "Sin ánimo"}
                      </div>
                      <p className="m-0 mt-2 text-[14px]" style={{ color: "var(--card-solid-muted)" }}>
                        {selPhotoDay.note || "Sin nota."}
                      </p>
                    </>
                  ) : (
                    <p className="m-0 text-[14px]" style={{ color: "var(--card-solid-muted)" }}>
                      Elige una foto para ver sus detalles.
                    </p>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === "compare" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[13px]" style={{ opacity: 0.85 }}>
                Comparar día 1 con
              </span>
              {cmpCandidates.map((n) => (
                <OnColorTab key={n} selected={cmpDayNum === n} onClick={() => setCompareDay(n)}>
                  Día {n}
                </OnColorTab>
              ))}
              {cmpCandidates.length === 0 && (
                <span className="text-[14px]" style={{ color: "var(--mode-ink-muted)" }}>
                  Todavía no hay otro día con foto para comparar.
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Card tone="tint" className="p-4 text-[14px]">
                Entre estos dos días acumulaste <b>{formatMinutesLong(totalMinUpTo(cmpDayNum))}</b> de práctica y <b>{cmpDayNum - 1}</b> días de camino.
              </Card>
            )}
          </div>
        )}

        {tab === "diary" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="q" className="sr-only">
                Buscar en tus notas
              </label>
              <input
                id="q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en tus notas: técnica, metrónomo, canción…"
                className="min-h-10 max-w-[360px] flex-1 rounded-button border-0 bg-surface-muted px-3.5 text-[15px] text-surface-muted-ink outline-none placeholder:text-surface-muted-ink placeholder:opacity-60 focus:ring-2 focus:ring-[var(--mode-bg)]"
              />
              <span className="text-[13px]" style={{ color: "var(--mode-ink-muted)" }}>
                {matches.length} {matches.length === 1 ? "nota" : "notas"}
                {matches.length > 6 ? " · mostrando las 6 más recientes" : ""}
              </span>
            </div>
            {shown.length === 0 ? (
              <Card tone="tint" className="p-6 text-[15px]">
                Nada con esa palabra todavía. Prueba con otra.
              </Card>
            ) : (
              <Card tone="solid" className="p-0">
                {shown.map((d, i) => (
                  <Link
                    key={d.id}
                    href={`/retos/${challenge.id}/dia?day=${d.dayNumber}`}
                    className="flex items-start gap-4 p-4"
                    style={i > 0 ? { borderTop: "1px solid var(--card-solid-line)" } : undefined}
                  >
                    <span className="font-num shrink-0 text-[18px] font-extrabold" style={{ color: "var(--mode-bg)" }}>
                      D{d.dayNumber}
                    </span>
                    <span className="font-num w-[100px] shrink-0 text-[12px] leading-snug" style={{ color: "var(--card-solid-muted)" }}>
                      {formatShortDateEs(new Date(`${d.date}T00:00:00`))}
                      <br />
                      {formatMinutesLong(d.durationMin)}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px]" style={{ color: "var(--card-solid-ink)" }}>
                      {d.note}
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function CompareCard({ label, date, photoUrl, note, accent }: { label: string; date: string; photoUrl?: string; note: string; accent?: boolean }) {
  return (
    <Card tone="solid" className="flex min-w-0 flex-col gap-2.5 p-4" style={accent ? { boxShadow: "inset 0 0 0 2px var(--mode-bg)" } : undefined}>
      <div className="flex justify-between">
        <span className="text-[13px] font-bold" style={{ color: "var(--card-solid-muted)" }}>
          {label}
        </span>
        <span className="font-num text-[12px]" style={{ color: "var(--card-solid-muted)" }}>
          {date}
        </span>
      </div>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={label} className="h-[220px] w-full rounded-[8px] object-cover" />
      ) : (
        <div
          className="flex h-[220px] items-center justify-center rounded-[8px] text-[14px]"
          style={{ background: "var(--surface-muted)", color: "var(--surface-muted-ink)" }}
        >
          Sin foto
        </div>
      )}
      <p className="m-0 text-[14px]" style={{ color: "var(--card-solid-muted)" }}>
        {note}
      </p>
    </Card>
  );
}
