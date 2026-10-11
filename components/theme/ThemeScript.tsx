// Blocking, pre-paint theme bootstrap. Runs before React hydrates so there is
// no flash of the wrong theme. Reads the small localStorage cache written by
// lib/theme/apply.ts; the authoritative source (the user's Firestore profile)
// is applied right after by ThemeProvider, which also keeps this cache fresh.
const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var THEMES = {
      pegatina: { mode: "light", a1: "#FFD84D", a2: "#FF8FB8", a3: "#7BE0A4" },
      mocha: { mode: "dark", a1: "#F9E2AF", a2: "#F5C2E7", a3: "#A6E3A1" },
      macchiato: { mode: "dark", a1: "#EED49F", a2: "#F5BDE6", a3: "#A6DA95" },
      frappe: { mode: "dark", a1: "#E5C890", a2: "#F4B8E4", a3: "#A6D189" },
      latte: { mode: "light", a1: "#F2C46D", a2: "#EA76CB", a3: "#8BD17C" },
      nord: { mode: "dark", a1: "#EBCB8B", a2: "#B48EAD", a3: "#A3BE8C" },
      gruvbox: { mode: "dark", a1: "#FABD2F", a2: "#D3869B", a3: "#B8BB26" },
      rosepine: { mode: "dark", a1: "#F6C177", a2: "#EB6F92", a3: "#9CCFD8" }
    };
    var SWATCHES = ["#FFD84D", "#FF8FB8", "#7BE0A4", "#7CC4FF", "#FF9F5A"];
    var raw = localStorage.getItem("oficio-theme-cache");
    var cache = raw ? JSON.parse(raw) : null;
    var themeId = (cache && cache.themeId) || "pegatina";
    var accentIdx = cache && typeof cache.accentIdx === "number" ? cache.accentIdx : null;
    if (cache && cache.followSystem) {
      var hour = new Date().getHours();
      themeId = hour >= 7 && hour < 19 ? "latte" : "mocha";
      accentIdx = null;
    }
    var theme = THEMES[themeId] || THEMES.pegatina;
    var a1 = accentIdx != null && accentIdx >= 0 && accentIdx < SWATCHES.length ? SWATCHES[accentIdx] : theme.a1;
    var root = document.documentElement;
    root.setAttribute("data-theme", themeId);
    root.style.setProperty("--a1", a1);
    root.style.setProperty("--a2", theme.a2);
    root.style.setProperty("--a3", theme.a3);
    root.style.colorScheme = theme.mode;
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />;
}
