// Centralized Spanish UI copy for pieces reused across the app (nav, shared
// labels). Not exhaustive — most screen copy lives inline in its component,
// but structured so an i18n layer could be dropped in here later without
// touching every file.
export const strings = {
  app: { name: "Oficio" },
  nav: {
    // Matches design-reference/punto's top nav exactly: Hoy · Práctica ·
    // Datos · Retos · Logros · Tienda (center tabs), Avisos (bell icon) and
    // Ajustes (avatar) live in the header's right-hand cluster instead of
    // the tab row — see components/layout/TopNav.tsx.
    panel: "Hoy",
    temporizador: "Práctica",
    estadisticas: "Datos",
    retos: "Retos",
    logros: "Logros",
    tienda: "Tienda",
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
