"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { exportUserDataToCsv } from "@/lib/csv-export";

// "Cuenta" tab — split out of the old monolithic PerfilPanel so the three
// Ajustes tabs (Perfil / Apariencia / Cuenta) match
// design-reference/punto/html/PuntoAjustes.dc.html's own split. Real logic
// (password change, CSV export, sign-out, delete-account) is carried over
// unchanged from the previous PerfilPanel aside — only the layout/skin is
// new, styled as flat hairline rows (`.row` in the reference) instead of
// the old neo-brutalist sidebar cards.
//
// The reference also lists a "Conectar calendario" row — there is no real
// calendar-integration logic anywhere in this codebase, so it's
// intentionally left out rather than faked.

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (next.length < 6) return setError("La nueva contraseña debe tener al menos 6 caracteres.");
    if (next !== confirm) return setError("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      onOpenChange(false);
    } catch {
      setError("No se pudo cambiar la contraseña. Revisa tu contraseña actual.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <div className="flex flex-col gap-5">
          <DialogTitle className="m-0 text-2xl font-medium">Cambiar contraseña</DialogTitle>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-current">Contraseña actual</Label>
            <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-next">Nueva contraseña</Label>
            <Input id="cp-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-confirm">Confirmar nueva contraseña</Label>
            <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={busy || !current || !next}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { deleteAccount, hasPasswordProvider } = useAuth();
  const usesPassword = hasPasswordProvider();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSubmit = confirmText === "ELIMINAR" && (!usesPassword || password.length > 0);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(usesPassword ? password : undefined);
      // On success, Firebase Auth signs the user out; AppShell redirects to /login.
    } catch {
      setError("No se pudo eliminar la cuenta. Vuelve a iniciar sesión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <div className="flex flex-col gap-5">
          <DialogTitle className="m-0 text-2xl font-medium text-danger">Eliminar cuenta</DialogTitle>
          <p className="m-0 text-muted">
            Esto borra permanentemente todas tus habilidades, sesiones, logros y recordatorios. No se puede deshacer.
          </p>
          {usesPassword && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="del-pass">Contraseña actual</Label>
              <Input id="del-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-confirm">
              Escribe <strong>ELIMINAR</strong> para confirmar
            </Label>
            <Input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={!canSubmit || busy} variant="danger">
            {busy ? "Eliminando…" : "Eliminar cuenta para siempre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-6 border-t py-6 first:border-t-0"
      style={{ borderColor: danger ? "color-mix(in srgb, var(--danger) 35%, transparent)" : "var(--line)" }}
    >
      <div className="flex flex-col gap-1">
        <span className={danger ? "text-[20px] font-medium text-danger" : "text-[20px] font-medium"}>{title}</span>
        <span className="text-sm text-muted">{description}</span>
      </div>
      {children}
    </div>
  );
}

export function CuentaPanel() {
  const { user, signOut, hasPasswordProvider } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserDataToCsv(user!.uid);
    } finally {
      setExporting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-[820px]">
      {hasPasswordProvider() ? (
        <Row title="Contraseña" description="Cambia la contraseña de tu cuenta">
          <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
            Cambiar
          </Button>
        </Row>
      ) : (
        <Row title="Contraseña" description="Iniciaste sesión con Google, no tienes contraseña que cambiar aquí">
          <span />
        </Row>
      )}

      <Row title="Exportar mis datos" description="Descarga tus horas, notas y habilidades en un archivo CSV">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exportando…" : "Exportar"}
        </Button>
      </Row>

      <Row title="Cerrar sesión" description="Salir de este dispositivo">
        <Button variant="outline" size="sm" onClick={signOut}>
          Cerrar sesión
        </Button>
      </Row>

      <Row title="Zona de riesgo" description="Eliminar la cuenta borra todas tus horas, habilidades y logros. No se puede deshacer." danger>
        <Button variant="danger" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          Eliminar cuenta
        </Button>
      </Row>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}
