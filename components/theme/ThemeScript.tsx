// Blocking, pre-paint theme bootstrap. Runs before React hydrates so there is
// no flash of the wrong theme. Reads the small localStorage cache written by
// lib/theme/apply.ts; the authoritative source (the user's Firestore profile)
// is applied right after by ThemeProvider, which also keeps this cache fresh.
const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var THEMES = {
      oficio: { mode: "dark", accents: ["#F0A93B", "#4FC1AC", "#B5A1F0", "#F07A5C"] },
      mocha: { mode: "dark", accents: ["#cba6f7", "#fab387", "#94e2d5", "#89b4fa", "#a6e3a1", "#f5c2e7"] },
      macchiato: { mode: "dark", accents: ["#c6a0f6", "#f5a97f", "#8bd5ca", "#8aadf4", "#a6da95", "#f5bde6"] },
      frappe: { mode: "dark", accents: ["#ca9ee6", "#ef9f76", "#81c8be", "#8caaee", "#a6d189", "#f4b8e4"] },
      latte: { mode: "light", accents: ["#8839ef", "#1e66f5", "#179299", "#40a02b", "#fe640b", "#ea76cb"] },
      nord: { mode: "dark", accents: ["#88c0d0", "#ebcb8b", "#a3be8c", "#b48ead", "#d08770", "#81a1c1"] },
      gruvbox: { mode: "dark", accents: ["#fabd2f", "#8ec07c", "#d3869b", "#83a598", "#fe8019", "#b8bb26"] },
      rosepine: { mode: "dark", accents: ["#ebbcba", "#c4a7e7", "#9ccfd8", "#f6c177", "#eb6f92"] }
    };
    var raw = localStorage.getItem("oficio-theme-cache");
    var cache = raw ? JSON.parse(raw) : null;
    var themeId = (cache && cache.themeId) || "oficio";
    var accentIdx = cache && typeof cache.accentIdx === "number" ? cache.accentIdx : 0;
    if (cache && cache.followSystem) {
      var hour = new Date().getHours();
      themeId = hour >= 7 && hour < 19 ? "latte" : "mocha";
      accentIdx = 0;
    }
    var theme = THEMES[themeId] || THEMES.oficio;
    var accents = theme.accents;
    var idx = accentIdx >= 0 && accentIdx < accents.length ? accentIdx : 0;
    var accent = accents[idx];
    var rest = accents.filter(function (h) { return h !== accent; });
    var root = document.documentElement;
    root.setAttribute("data-theme", themeId);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--a2", rest[0] || accent);
    root.style.setProperty("--a3", rest[1] || rest[0] || accent);
    root.style.colorScheme = theme.mode;
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />;
}
