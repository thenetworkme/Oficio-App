// Punto-style dot-column chart: one column of round dots per month, lit
// bottom-up proportional to hours practiced that month (same "lit prefix of
// a fixed-row grid" treatment as the reference's horas-por-día chart on
// PuntoStats), rather than a drawn bar. Signal color marks the current month.

export interface MonthDatum {
  label: string;
  hours: number;
  isCurrent: boolean;
}

const ROWS = 8;

export function MonthlyHoursChart({ data }: { data: MonthDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.hours));

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label="Horas practicadas por mes en el último año"
        className="grid gap-y-2"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS }).map((_, row) =>
          data.map((d) => {
            const level = Math.round((d.hours / max) * ROWS);
            const lit = ROWS - row <= level;
            return (
              <i
                key={`${row}-${d.label}`}
                aria-hidden="true"
                className="block size-2.5 justify-self-center rounded-full sm:size-3"
                style={{ background: lit ? (d.isCurrent ? "var(--signal)" : "var(--ink)") : "var(--line)" }}
              />
            );
          }),
        )}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d) => (
          <span
            key={d.label}
            className="label-xs text-center !text-[10px]"
            style={{ color: d.isCurrent ? "var(--signal)" : undefined }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
