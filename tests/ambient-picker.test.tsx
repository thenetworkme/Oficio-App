import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import type { AmbientSoundId } from "@/lib/types";

/**
 * Regression coverage for the "Silencio" chip removal (see
 * components/sound/AmbientPicker.tsx): there is no explicit "none" chip
 * anymore, so clicking the currently-selected chip must toggle ambient sound
 * off, while clicking a different chip must switch to it.
 */

const setAmbientSoundId = vi.fn();

vi.mock("@/lib/sound/SoundProvider", () => ({
  useSound: () => ({
    ambientSoundId: mockState.ambientSoundId,
    setAmbientSoundId,
    ambientVolume: 0.5,
    setAmbientVolume: vi.fn(),
  }),
}));

const mockState: { ambientSoundId: AmbientSoundId } = { ambientSoundId: "none" };

describe("AmbientPicker", () => {
  it("renders no explicit 'Silencio' chip", () => {
    mockState.ambientSoundId = "none";
    render(<AmbientPicker />);
    expect(screen.queryByText("Silencio")).toBeNull();
  });

  it("renders all 8 recorded-sound chips", () => {
    mockState.ambientSoundId = "none";
    render(<AmbientPicker />);
    for (const label of ["Lluvia", "Olas", "Lofi", "Tormenta", "Chimenea", "Grillos", "Bosque", "Cafetería"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("clicking a different chip switches to it", () => {
    mockState.ambientSoundId = "rain";
    setAmbientSoundId.mockClear();
    render(<AmbientPicker />);
    fireEvent.click(screen.getByText("Olas"));
    expect(setAmbientSoundId).toHaveBeenCalledWith("waves");
  });

  it("clicking the currently-selected chip toggles ambient sound off", () => {
    mockState.ambientSoundId = "forest";
    setAmbientSoundId.mockClear();
    render(<AmbientPicker />);
    fireEvent.click(screen.getByText("Bosque"));
    expect(setAmbientSoundId).toHaveBeenCalledWith("none");
  });
});
