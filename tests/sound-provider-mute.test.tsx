import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SoundProvider, useSound } from "@/lib/sound/SoundProvider";

/**
 * THE core regression test for this task's bug report: "I click the mute
 * button and the ambient sound keeps playing." Confirms the exact root
 * cause (setSoundEffectsEnabled only ever gated the short effect chimes,
 * never the separately-playing ambient loop) is fixed by toggleAllSound(),
 * which the fullscreen quick-access button now calls instead.
 *
 * Mocks only the Web Audio / fetch primitives that lib/sound/ambient.ts and
 * lib/sound/engine.ts touch — SoundProvider and ambient.ts run their real
 * code, so a passing test here proves actual silence (AudioBufferSourceNode
 * .stop() really called), not just a state flag flipping.
 */

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ profile: null }),
}));

class FakeGainParam {
  value = 0;
}
class FakeGainNode {
  gain = new FakeGainParam();
  connect() {}
}
class FakeBufferSource {
  buffer: unknown = null;
  loop = false;
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  connect() {}
}

let createdSources: FakeBufferSource[] = [];

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state: AudioContextState = "running";
  createGain() {
    return new FakeGainNode();
  }
  createBufferSource(): FakeBufferSource {
    const src = new FakeBufferSource();
    createdSources.push(src);
    return src;
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: { value: 0 },
      connect() {},
      start() {},
      stop() {},
    };
  }
  decodeAudioData() {
    return Promise.resolve({});
  }
  resume() {
    return Promise.resolve();
  }
}

function Harness() {
  const sound = useSound();
  return (
    <div>
      <span data-testid="effects-enabled">{String(sound.soundEffectsEnabled)}</span>
      <button onClick={() => sound.setAmbientSoundId("rain")}>pick-rain</button>
      <button onClick={() => sound.startAmbientIfSelected()}>start-ambient</button>
      <button onClick={() => sound.toggleAllSound()}>toggle-all</button>
    </div>
  );
}

describe("SoundProvider toggleAllSound (mute-everything button)", () => {
  beforeEach(() => {
    createdSources = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
    );
  });

  it("stops a currently-playing ambient sound when muted, and resumes the SAME sound when unmuted", async () => {
    render(
      <SoundProvider>
        <Harness />
      </SoundProvider>,
    );

    // Select + start the "rain" ambient loop (mirrors picking a chip then
    // pressing play on the real Temporizador screen). Picking the chip
    // itself previews it immediately (see SoundProvider.setAmbientSoundId),
    // and start-ambient restarts it the same way "Dale" would — so two
    // sources exist by this point, with the most recent one (index 1) the
    // one actually left running.
    await act(async () => {
      fireEvent.click(screen.getByText("pick-rain"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("start-ambient"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createdSources).toHaveLength(2);
    const runningSource = createdSources[1];
    expect(runningSource.start).toHaveBeenCalledTimes(1);
    expect(runningSource.stop).not.toHaveBeenCalled();

    // Click the mute-everything button: the ambient source must actually be
    // stopped — real silence, not just a flag.
    await act(async () => {
      fireEvent.click(screen.getByText("toggle-all"));
    });
    expect(runningSource.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("effects-enabled").textContent).toBe("false");

    // Click it again: a NEW ambient source must be started for the SAME
    // previously-selected sound (rain) — this is the user-gesture-driven
    // resume, proving unmute brings the ambient loop back rather than
    // leaving it silent forever.
    await act(async () => {
      fireEvent.click(screen.getByText("toggle-all"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("effects-enabled").textContent).toBe("true");
    expect(createdSources).toHaveLength(3);
    expect(createdSources[2].start).toHaveBeenCalledTimes(1);
  });

  it("does nothing to ambient when muting if no ambient sound was playing", async () => {
    render(
      <SoundProvider>
        <Harness />
      </SoundProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("toggle-all"));
    });
    expect(screen.getByTestId("effects-enabled").textContent).toBe("false");
    expect(createdSources).toHaveLength(0);

    await act(async () => {
      fireEvent.click(screen.getByText("toggle-all"));
    });
    expect(screen.getByTestId("effects-enabled").textContent).toBe("true");
    // Unmuting must not start ambient out of nowhere when nothing was
    // playing before the mute.
    expect(createdSources).toHaveLength(0);
  });
});
