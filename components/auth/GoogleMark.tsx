/**
 * The reference's inline "G" badge (design-reference/pomodoro/html/
 * PomoLogin.dc.html / PomoSignup.dc.html): a small solid-gray circle with a
 * white "G", standing in for a real Google logo. Fixed gray/white in both
 * themes (same rationale as --flat-dark/--go-bg — a tiny brand-adjacent
 * badge, not a surface that should flip with light/dark mode), shared
 * between /login and /registro so both "Continuar con Google" /
 * "Registrarme con Google" buttons render identically.
 */
export function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{ background: "#555", color: "#fff" }}
    >
      G
    </span>
  );
}
