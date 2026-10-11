"use client";

// Tomi — the placeholder mascot, extracted verbatim (viewBox, paths, colors)
// from the Pegatina mockups (e.g. design-reference/pegatina/html/PegatinaPanel.dc.html).
// This is the real SVG asset shipped in the design package, not a redraw.
//
// Future work: replace this with the animated Rive "Muza" mascot — see
// design-reference/pegatina/PROMPT-RIVE-MUZA.md for the integration prompt.
// There is no .riv file in this repo yet, so that swap is intentionally out
// of scope here. When it happens, keep this component's prop shape (size,
// mood, hat/cape/acc/bg, className, onClick) so callers don't need to change.
//
// Equip overlays (hat/cape/acc) are positioned to match Tomi's fixed body —
// this percentage-based placement is tuned for this static character and
// will need redoing once the mascot actually moves (Rive).

import { useMemo } from "react";

export type MascotMood = "idle" | "celebrate" | "cheer" | "sleepy";

export interface MascotProps {
  size?: number;
  mood?: MascotMood;
  hat?: string | null;
  cape?: string | null;
  acc?: string | null;
  bg?: string | null;
  className?: string;
  onClick?: () => void;
}

const BG_HEX: Record<string, string> = {
  cream: "#FFF4D6",
  mint: "#BFF2D6",
  sky: "#BFE3FF",
  lilac: "#E3D5FF",
  sunset: "#FFC9A3",
};

function moodClass(mood: MascotMood): string {
  if (mood === "celebrate") return "mascot-celebrate";
  if (mood === "cheer") return "mascot-levelup";
  return "";
}

export function Mascot({ size = 200, mood = "idle", hat, cape, acc, bg, className, onClick }: MascotProps) {
  const mBg = (bg && BG_HEX[bg]) || BG_HEX.cream;
  const sleepy = mood === "sleepy";
  const open = mood === "celebrate" || mood === "cheer";

  const disp = useMemo(
    () => ({
      cred: cape === "red" ? "inline" : "none",
      cstar: cape === "star" ? "inline" : "none",
      cmaster: cape === "master" ? "inline" : "none",
      leaf: hat ? "none" : "inline",
      smile: !open ? "inline" : "none",
      openMouth: open ? "inline" : "none",
      aglass: acc === "glass" ? "inline" : "none",
      amono: acc === "mono" ? "inline" : "none",
      ascarf: acc === "scarf" ? "inline" : "none",
      abow: acc === "bow" ? "inline" : "none",
      hcap: hat === "cap" ? "inline" : "none",
      htop: hat === "top" ? "inline" : "none",
      hcrown: hat === "crown" ? "inline" : "none",
      hchef: hat === "chef" ? "inline" : "none",
      hwiz: hat === "wiz" ? "inline" : "none",
    }),
    [cape, hat, acc, open],
  );

  const Wrap = onClick ? "button" : "div";

  return (
    <Wrap
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? "Tu mascota Tomi" : undefined}
      className={className}
      style={{
        display: "inline-flex",
        border: 0,
        background: "none",
        padding: 0,
        cursor: onClick ? "pointer" : undefined,
        transform: sleepy ? "rotate(-4deg)" : undefined,
        opacity: sleepy ? 0.85 : 1,
      }}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="Tomi, tu mascota"
        className={moodClass(mood)}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      >
        <g stroke="#111" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round">
          <rect x="4" y="4" width="192" height="192" rx="30" fill={mBg} />
          <ellipse cx="100" cy="184" rx="50" ry="8" fill="rgba(17,17,17,.18)" stroke="none" />
          <g style={{ display: disp.cred }}>
            <path d="M50 108 L22 188 L178 188 L150 108 Z" fill="#FF4D4D" />
          </g>
          <g style={{ display: disp.cstar }}>
            <path d="M50 108 L22 188 L178 188 L150 108 Z" fill="#2B3A8C" />
            <g fill="#FFD84D" stroke="none">
              <circle cx="40" cy="170" r="5" />
              <circle cx="160" cy="165" r="5" />
              <circle cx="70" cy="182" r="4" />
              <circle cx="132" cy="180" r="4" />
            </g>
          </g>
          <g style={{ display: disp.cmaster }}>
            <path d="M50 108 L22 188 L178 188 L150 108 Z" fill="#FFD84D" />
            <path d="M30 176 L170 176" stroke="#111" strokeWidth={5} fill="none" />
            <circle cx="100" cy="176" r="6" fill="#FF8FB8" />
          </g>
          <ellipse cx="100" cy="118" rx="60" ry="56" fill="#FF8FB8" />
          <g style={{ display: disp.leaf }}>
            <path
              d="M100 64 C88 52 70 54 62 60 C74 70 88 72 100 64Z M100 64 C112 52 130 54 138 60 C126 70 112 72 100 64Z M100 64 L100 50"
              fill="#7BE0A4"
            />
          </g>
          <g stroke="none">
            <circle cx="64" cy="130" r="9" fill="#fff" opacity=".45" />
            <circle cx="136" cy="130" r="9" fill="#fff" opacity=".45" />
          </g>
          <g strokeWidth={4}>
            <circle cx="78" cy="108" r="12" fill="#fff" />
            <circle cx="122" cy="108" r="12" fill="#fff" />
          </g>
          <g fill="#111" stroke="none">
            <circle cx="80" cy={sleepy ? 112 : 109} r="5.5" />
            <circle cx="120" cy={sleepy ? 112 : 109} r="5.5" />
          </g>
          <g style={{ display: disp.smile }}>
            <path d="M86 130 Q100 144 114 130" fill="none" />
          </g>
          <g style={{ display: disp.openMouth }}>
            <path d="M84 128 Q100 158 116 128 Z" fill="#111" />
            <path d="M92 143 Q100 150 108 143 Q100 138 92 143Z" fill="#FF8FB8" stroke="none" />
          </g>
          <g style={{ display: disp.aglass }} strokeWidth={4}>
            <circle cx="78" cy="108" r="17" fill="rgba(124,196,255,.35)" />
            <circle cx="122" cy="108" r="17" fill="rgba(124,196,255,.35)" />
            <path d="M95 108 L105 108" fill="none" />
          </g>
          <g style={{ display: disp.amono }} strokeWidth={4}>
            <circle cx="122" cy="108" r="18" fill="rgba(255,255,255,.3)" />
            <path d="M138 120 Q150 150 140 180" fill="none" strokeWidth={3} />
          </g>
          <g style={{ display: disp.ascarf }}>
            <path d="M54 160 Q100 186 146 160 L150 176 Q100 202 50 176 Z" fill="#FF4D4D" />
            <path d="M126 182 L142 200 L120 198 Z" fill="#FF4D4D" />
          </g>
          <g style={{ display: disp.abow }}>
            <path d="M100 170 L74 156 L74 184 Z" fill="#FF8FB8" />
            <path d="M100 170 L126 156 L126 184 Z" fill="#FF8FB8" />
            <circle cx="100" cy="170" r="8" fill="#FFD84D" />
          </g>
          <g style={{ display: disp.hcap }}>
            <path d="M58 76 Q100 24 142 76 Z" fill="#7CC4FF" />
            <path d="M110 74 Q152 66 174 82 Q164 94 112 86 Z" fill="#4AA3E8" />
            <circle cx="100" cy="42" r="5" fill="#FFD84D" strokeWidth={3} />
          </g>
          <g style={{ display: disp.htop }}>
            <ellipse cx="100" cy="74" rx="48" ry="9" fill="#2B2B2B" />
            <path d="M68 74 L70 24 Q100 16 130 24 L132 74 Z" fill="#2B2B2B" />
            <rect x="69" y="52" width="62" height="12" fill="#FFD84D" strokeWidth={3} />
          </g>
          <g style={{ display: disp.hcrown }}>
            <path d="M62 78 L66 38 L86 58 L100 32 L114 58 L134 38 L138 78 Z" fill="#FFD84D" />
            <circle cx="100" cy="62" r="5" fill="#FF8FB8" strokeWidth={3} />
          </g>
          <g style={{ display: disp.hchef }}>
            <circle cx="78" cy="48" r="20" fill="#fff" />
            <circle cx="100" cy="38" r="22" fill="#fff" />
            <circle cx="122" cy="48" r="20" fill="#fff" />
            <rect x="72" y="62" width="56" height="16" rx="4" fill="#fff" />
          </g>
          <g style={{ display: disp.hwiz }}>
            <path d="M66 78 L100 8 L134 78 Z" fill="#8E7CFF" />
            <ellipse cx="100" cy="78" rx="54" ry="10" fill="#8E7CFF" />
            <g fill="#FFD84D" stroke="none">
              <circle cx="96" cy="48" r="4" />
              <circle cx="108" cy="62" r="3" />
              <circle cx="88" cy="66" r="3" />
            </g>
          </g>
        </g>
      </svg>
    </Wrap>
  );
}
