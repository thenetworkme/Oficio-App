import { DotDigits } from "@/components/ui/DotDigits";
import { Wordmark } from "@/components/layout/TopNav";

/**
 * Shared split-screen shell for /login, /registro and /recuperar — matches
 * PuntoLogin/PuntoSignup/PuntoRecuperar.dc.html: a left panel with the
 * wordmark, the "10000" dot-matrix hero and the tagline, and a right panel
 * with the actual form (eyebrow label + big thin headline + children).
 *
 * The three screens' left panel is pixel-identical in the reference (same
 * dots, same copy, same footer label), so it lives here once instead of
 * being duplicated across three page files.
 */
export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="hidden flex-col gap-10 border-line px-14 py-9 lg:flex lg:w-1/2 lg:border-r">
        <Wordmark />
        <div className="flex flex-1 flex-col justify-center gap-10">
          <DotDigits value="10000" size={14} gap={7} ariaLabel="10.000 horas" className="max-w-[600px]" />
          <p className="m-0 max-w-[560px] text-[40px] font-light leading-[1.1] tracking-tighter text-ink">
            horas para dominar
            <br />
            cualquier habilidad.
          </p>
        </div>
        <span className="label-xs">Registra tu práctica · cada hora cuenta</span>
      </aside>

      <section className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-10 lg:hidden">
            <Wordmark />
          </div>
          <span className="label-xs mb-3.5 block">{eyebrow}</span>
          <h1 className="m-0 mb-9 text-[40px] font-light leading-[1] tracking-tighter text-ink sm:text-[56px]">{title}</h1>
          {children}
        </div>
      </section>
    </div>
  );
}
