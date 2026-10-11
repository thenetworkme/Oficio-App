import Link from "next/link";
import { Mascot, type MascotMood } from "@/components/mascot/Mascot";

/** Shared two-pane layout for /login, /registro and /recuperar, matching
 * PegatinaLogin/PegatinaSignup.dc.html: a colored aside with Tomi + a
 * headline + stat chips, and a white card with the form. */
export function AuthShell({
  asideColor,
  bubble,
  mood = "idle",
  headline,
  children,
}: {
  asideColor: string;
  bubble: string;
  mood?: MascotMood;
  headline: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col gap-8 bg-paper px-5 py-7 sm:px-12 sm:py-9">
      <main className="flex flex-1 flex-wrap items-stretch gap-9">
        <aside className="bx relative flex min-h-[420px] flex-1 basis-[440px] flex-col gap-5 overflow-hidden p-9" style={{ background: asideColor }}>
          <Link href="/login" className="bx inline-flex self-start bg-card px-4 py-1" style={{ transform: "rotate(-2deg)" }}>
            <span className="text-[26px] font-bold tracking-tight">oficio!</span>
          </Link>
          <div className="relative self-center">
            <Mascot size={220} mood={mood} hat="cap" />
            <div className="bx absolute -right-6 -top-2 max-w-[200px] bg-card px-4 py-2 font-bold" style={{ transform: "rotate(6deg)" }}>
              {bubble}
            </div>
          </div>
          <h2 className="m-0 text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[40px]">{headline}</h2>
          <div className="mt-auto flex flex-wrap gap-3">
            <span className="bx bg-card px-3.5 py-2 font-bold" style={{ transform: "rotate(-2deg)" }}>
              🔥 12 días de racha
            </span>
            <span className="bx px-3.5 py-2 font-bold" style={{ background: "var(--a2)", transform: "rotate(1.5deg)" }}>
              ⏱ 1.692 h registradas
            </span>
            <span className="bx px-3.5 py-2 font-bold" style={{ background: "var(--a3)", transform: "rotate(-1deg)" }}>
              🏆 Meta: 10.000 h
            </span>
          </div>
        </aside>
        <section className="bx flex flex-1 basis-[480px] flex-col justify-center gap-5 p-9">{children}</section>
      </main>
    </div>
  );
}

export function GoogleSwatch() {
  return (
    <span
      aria-hidden="true"
      className="flex size-7.5 items-center justify-center rounded-full border-[3px] border-ink"
      style={{ background: "conic-gradient(var(--a2) 0 25%, var(--a1) 0 50%, var(--a3) 0 75%, #7CC4FF 0)" }}
    >
      <span className="flex size-4.5 items-center justify-center rounded-full bg-card text-[12px] font-bold">G</span>
    </span>
  );
}
