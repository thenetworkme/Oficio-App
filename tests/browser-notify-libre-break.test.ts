import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyLibreBreak, notifyPeriodComplete } from "@/lib/notifications/browserNotify";

/**
 * Regression coverage for the "I never got a notification when my libre
 * break started" bug report: notifyLibreBreak must fire even while the tab
 * is visible, because a libre break interrupting an active session is, by
 * definition, happening while the tab is visible at that exact moment — see
 * the function's doc comment in lib/notifications/browserNotify.ts.
 *
 * notifyPeriodComplete (Pomodoro) is exercised here too, under the exact
 * same visible+granted conditions, to prove this change is scoped to the
 * libre break reminder and did NOT also loosen Pomodoro's notification
 * behavior.
 */
describe("notifyLibreBreak", () => {
  let NotificationMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    NotificationMock = vi.fn();
    (NotificationMock as unknown as { permission: NotificationPermission }).permission = "granted";
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("document", { visibilityState: "visible" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies for break 'start' even while the tab is visible, when enabled + granted", () => {
    notifyLibreBreak("start", true);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
    const [title] = NotificationMock.mock.calls[0];
    expect(title).toBe("Hora de un descanso");
  });

  it("notifies for break 'end' even while the tab is visible, when enabled + granted", () => {
    notifyLibreBreak("end", true);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
    const [title] = NotificationMock.mock.calls[0];
    expect(title).toBe("¿Seguimos?");
  });

  it("still does not notify when notificationsEnabled is false", () => {
    notifyLibreBreak("start", false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("still does not notify when permission is not granted", () => {
    (NotificationMock as unknown as { permission: NotificationPermission }).permission = "denied";
    notifyLibreBreak("start", true);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("never throws even if the Notification API is missing (SSR-safe guard)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("document", { visibilityState: "visible" });
    expect(() => notifyLibreBreak("start", true)).not.toThrow();
  });

  it("by contrast, notifyPeriodComplete (Pomodoro) still does NOT fire while the tab is visible — proving this change stayed scoped to libre break reminders", () => {
    notifyPeriodComplete("focus", true);
    expect(NotificationMock).not.toHaveBeenCalled();
  });
});
