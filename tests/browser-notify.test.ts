import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyPeriodComplete } from "@/lib/notifications/browserNotify";

/**
 * notifyPeriodComplete() is the function called from the exact spot
 * app/(app)/temporizador/page.tsx calls sound.playComplete(), so it must
 * only ever reach the real `Notification` constructor when all of: the user
 * opted in, the API exists, permission is granted, AND the tab is hidden —
 * the in-app sound/toast already covers the foreground case, so firing a
 * native notification then would be double feedback (see
 * lib/notifications/browserNotify.ts for the full rationale).
 */
describe("notifyPeriodComplete", () => {
  let NotificationMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    NotificationMock = vi.fn();
    (NotificationMock as unknown as { permission: NotificationPermission }).permission = "granted";
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("document", { visibilityState: "hidden" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not notify when notificationsEnabled is false, even if hidden and granted", () => {
    notifyPeriodComplete("focus", false);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("does not notify when the tab is visible", () => {
    vi.stubGlobal("document", { visibilityState: "visible" });
    notifyPeriodComplete("focus", true);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("does not notify when permission is not granted", () => {
    (NotificationMock as unknown as { permission: NotificationPermission }).permission = "denied";
    notifyPeriodComplete("focus", true);
    expect(NotificationMock).not.toHaveBeenCalled();

    (NotificationMock as unknown as { permission: NotificationPermission }).permission = "default";
    notifyPeriodComplete("focus", true);
    expect(NotificationMock).not.toHaveBeenCalled();
  });

  it("notifies with focus-finished copy when a focus period completes, hidden + enabled + granted", () => {
    notifyPeriodComplete("focus", true);
    expect(NotificationMock).toHaveBeenCalledTimes(1);
    const [title, options] = NotificationMock.mock.calls[0];
    expect(title).toBe("¡Sesión de enfoque terminada!");
    expect(options).toMatchObject({ icon: "/icons/icon-192.png" });
    expect(typeof options.body).toBe("string");
  });

  it("notifies with a different, break-finished message for short and long breaks", () => {
    notifyPeriodComplete("short", true);
    notifyPeriodComplete("long", true);
    expect(NotificationMock).toHaveBeenCalledTimes(2);
    const [shortTitle] = NotificationMock.mock.calls[0];
    const [longTitle] = NotificationMock.mock.calls[1];
    expect(shortTitle).not.toBe("¡Sesión de enfoque terminada!");
    expect(longTitle).not.toBe("¡Sesión de enfoque terminada!");
  });

  it("never throws even if the Notification API is missing (SSR-safe guard)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("document", { visibilityState: "hidden" });
    // No `Notification` global at all in this scope.
    expect(() => notifyPeriodComplete("focus", true)).not.toThrow();
  });
});
