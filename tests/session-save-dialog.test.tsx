import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionSaveDialog } from "@/components/timer/SessionSaveDialog";

/**
 * Regression coverage for the "objetivo typed during a session is never
 * saved" fix: SessionSaveDialog's `note` field must default to the
 * session's `initialNote` (the "Intención de esta sesión" text) when the
 * dialog opens, stay freely editable, and never leak a previous session's
 * intention into a new one — both <SessionSaveDialog> instances in
 * temporizador/page.tsx persist across saves rather than unmounting.
 */

vi.mock("@/lib/hooks/usePet", () => ({
  usePet: () => ({
    equipped: {},
    level: 1,
    xpIntoLevel: 0,
    xpForNext: 100,
    xpPct: 0,
  }),
}));

vi.mock("@/lib/sound/SoundProvider", () => ({
  useSound: () => ({
    playSuccess: vi.fn(),
  }),
}));

function noteInput() {
  return screen.getByLabelText("¿En qué trabajaste? (opcional)") as HTMLInputElement;
}

describe("SessionSaveDialog initialNote pre-fill", () => {
  it("pre-fills the note from initialNote when opened", () => {
    render(
      <SessionSaveDialog
        open={true}
        durationMin={25}
        skillName="Guitarra"
        initialNote="Improvisar sobre un acorde"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(noteInput().value).toBe("Improvisar sobre un acorde");
  });

  it("defaults to an empty note when no initialNote is given", () => {
    render(<SessionSaveDialog open={true} durationMin={25} skillName="Guitarra" onSave={vi.fn()} onDiscard={vi.fn()} />);
    expect(noteInput().value).toBe("");
  });

  it("lets the user edit or clear the pre-filled note before saving", () => {
    render(
      <SessionSaveDialog
        open={true}
        durationMin={25}
        skillName="Guitarra"
        initialNote="Improvisar sobre un acorde"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    fireEvent.change(noteInput(), { target: { value: "" } });
    expect(noteInput().value).toBe("");
    fireEvent.change(noteInput(), { target: { value: "En realidad practiqué escalas" } });
    expect(noteInput().value).toBe("En realidad practiqué escalas");
  });

  it("does not leak a previous session's intention into a new one opened in the same instance", () => {
    const { rerender } = render(
      <SessionSaveDialog
        open={true}
        durationMin={25}
        skillName="Guitarra"
        initialNote="Primera sesión: acordes"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(noteInput().value).toBe("Primera sesión: acordes");

    // Session closes (pendingSave cleared) then a new one opens with its own intention.
    rerender(
      <SessionSaveDialog open={false} durationMin={0} skillName="Guitarra" initialNote="Primera sesión: acordes" onSave={vi.fn()} onDiscard={vi.fn()} />,
    );
    rerender(
      <SessionSaveDialog
        open={true}
        durationMin={15}
        skillName="Guitarra"
        initialNote="Segunda sesión: escalas"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    expect(noteInput().value).toBe("Segunda sesión: escalas");
  });
});
