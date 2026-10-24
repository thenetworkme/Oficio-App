import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/layout/TopNav";

/**
 * Shared centered shell for /login, /registro and /recuperar — matches
 * design-reference/pomodoro/html/PomoLogin.dc.html (and PomoSignup/
 * PomoRecuperar, which share the exact same chrome): full-bleed
 * `--mode-bg` page, a small centered wordmark, a centered white headline +
 * muted tagline sitting directly on the colored background, then a
 * centered `tone="solid"` card (the reference's `.wc`) holding the actual
 * form, with an optional link row below the card.
 *
 * Replaces the old "Punto" split-screen left/right layout entirely — this
 * is a structural change (Pomodoro has no split panel, no dot-matrix hero),
 * not a reskin, so the previous DotDigits-based left panel is gone.
 */
export function AuthShell({
  title,
  tagline,
  children,
  footer,
}: {
  title: React.ReactNode;
  tagline?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-mode-bg text-mode-ink">
      <header className="mx-auto flex h-[60px] w-full max-w-[620px] items-center px-5">
        <Wordmark className="text-mode-ink" />
      </header>

      <main className="mx-auto w-full max-w-[620px] flex-1 px-5 pb-20">
        <div className="mb-6 mt-9 text-center sm:mt-10">
          <h1 className="m-0 text-[28px] font-bold leading-[1.15] tracking-tight sm:text-[32px]">{title}</h1>
          {tagline && <p className="m-0 mt-1.5 text-[15px] text-mode-ink-muted sm:text-[16px]">{tagline}</p>}
        </div>

        <Card tone="solid" className="mx-auto w-full max-w-[420px] p-6 sm:p-7">
          {children}
        </Card>

        {footer && <div className="mt-5 text-center text-[15px] text-mode-ink-muted">{footer}</div>}
      </main>
    </div>
  );
}
