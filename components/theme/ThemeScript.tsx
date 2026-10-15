// Blocking, pre-paint theme bootstrap. Runs before React hydrates so there is
// no flash of the wrong theme/signal color. Reads the small localStorage
// cache written by lib/theme/apply.ts; the authoritative source (the user's
// Firestore profile) is applied right after by ThemeProvider, which also
// keeps this cache fresh. Mirrors lib/theme/tokens.ts's resolveMode/
// resolveSignal logic (kept in plain JS here since this must run standalone,
// before any module import resolves).
const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var SWATCHES = ["#FF4A1C", "#FFB020", "#3DDC84", "#4C8DFF", "#FF5FA2"];
    var raw = localStorage.getItem("oficio-theme-cache");
    var cache = raw ? JSON.parse(raw) : null;
    var themeId = (cache && cache.themeId) || "dark";
    var accentIdx = cache && typeof cache.accentIdx === "number" ? cache.accentIdx : 0;
    var mode = themeId;
    if (themeId === "system") {
      mode = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    if (mode !== "dark" && mode !== "light") mode = "dark";
    var signal = SWATCHES[accentIdx >= 0 && accentIdx < SWATCHES.length ? accentIdx : 0];
    var root = document.documentElement;
    root.setAttribute("data-theme", mode);
    root.style.setProperty("--signal", signal);
    root.style.colorScheme = mode;
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />;
}
