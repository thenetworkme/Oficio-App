// Centralized Spanish UI copy for pieces reused across the app (nav, shared
// labels). Not exhaustive — most screen copy lives inline in its component,
// but structured so an i18n layer could be dropped in here later without
// touching every file.
export const strings = {
  app: { name: "Oficio" },
  nav: {
    // "Pomodoro" header (components/layout/TopNav.tsx) nav items: Informe ·
    // Retos · Logros + a gear-only Ajustes button — matches design-
    // reference/pomodoro/html/PomoTimer.dc.html's <header> exactly (no
    // Tienda entry, confirmed removed and staying removed). `panel`/
    // `temporizador`/`recordatorios` are no longer header nav labels (the
    // reference's header has no "Hoy"/"Práctica" tabs or bell icon) but are
    // kept here — their routes ("/", "/temporizador", "/recordatorios")
    // still exist and are still reachable by direct link/other UI, just not
    // from this header.
    panel: "Hoy",
    temporizador: "Práctica",
    estadisticas: "Informe",
    retos: "Retos",
    logros: "Logros",
    recordatorios: "Avisos",
    ajustes: "Ajustes",
  },
  streak: {
    label: "Racha",
    days: (n: number) => (n === 1 ? "1 día" : `${n} días`),
    minimum: (min: number) => `Mínimo diario: ${min} min`,
  },
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    back: "Atrás",
    next: "Siguiente",
    logOut: "Cerrar sesión",
  },
};
