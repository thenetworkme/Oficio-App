import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be declared before importing the module under test (vi.mock is
// hoisted, but the fns referenced inside the factories below are defined
// with `vi.fn()` at module scope so every test can inspect/reset them).
const setDocMock = vi.fn();
const deleteDocMock = vi.fn();
const runTransactionMock = vi.fn();
const txGetMock = vi.fn();
const txSetMock = vi.fn();
const txUpdateMock = vi.fn();
const txDeleteMock = vi.fn();
const recordCrossedMilestonesMock = vi.fn();
const awardSessionEconomyMock = vi.fn();

vi.mock("@/lib/firebase", () => ({
  getDb: () => ({ __fakeDb: true }),
}));

vi.mock("@/lib/firestore/achievements", () => ({
  recordCrossedMilestones: (...args: unknown[]) => recordCrossedMilestonesMock(...args),
}));

vi.mock("@/lib/firestore/economy", () => ({
  awardSessionEconomy: (...args: unknown[]) => awardSessionEconomyMock(...args),
}));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  // doc(collectionRef) -> fresh ref for a new session; doc(db, path, id) -> ref to an existing doc.
  doc: (...args: unknown[]) => {
    if (args.length === 1) return { id: "new-session-id" };
    const [, path, id] = args as [unknown, string, string];
    return { id, __path: `${path}/${id}` };
  },
  setDoc: (...args: unknown[]) => setDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  runTransaction: async (db: unknown, cb: (tx: unknown) => unknown) => {
    runTransactionMock(db, cb);
    const tx = { get: txGetMock, set: txSetMock, update: txUpdateMock, delete: txDeleteMock };
    return cb(tx);
  },
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

const { saveSession, deleteSession } = await import("@/lib/firestore/sessions");

beforeEach(() => {
  setDocMock.mockReset();
  deleteDocMock.mockReset();
  runTransactionMock.mockReset();
  txGetMock.mockReset();
  txSetMock.mockReset();
  txUpdateMock.mockReset();
  txDeleteMock.mockReset();
  recordCrossedMilestonesMock.mockReset();
  awardSessionEconomyMock.mockReset();
  awardSessionEconomyMock.mockResolvedValue({ coinsGained: 10, xpGained: 20 });
  recordCrossedMilestonesMock.mockResolvedValue([1]);
});

describe("saveSession with skillId: null (stopwatch-sourced 'Sesión libre')", () => {
  it("writes the session doc directly, without any skill transaction", async () => {
    const result = await saveSession({
      userId: "u1",
      skillId: null,
      startedAt: Date.now(),
      durationMin: 15,
      quality: 4,
      note: "Trabajando en tareas",
      pomodoros: 0,
      source: "stopwatch",
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    expect(setDocMock.mock.calls[0][1]).toMatchObject({ skillId: null, durationMin: 15, source: "stopwatch" });
    expect(runTransactionMock).not.toHaveBeenCalled();
    expect(txGetMock).not.toHaveBeenCalled();
    expect(txUpdateMock).not.toHaveBeenCalled();
    expect(result.sessionId).toBe("new-session-id");
  });

  it("never calls recordCrossedMilestones (no skill whose milestones could be crossed)", async () => {
    await saveSession({
      userId: "u1",
      skillId: null,
      startedAt: Date.now(),
      durationMin: 15,
      quality: 4,
      note: null,
      pomodoros: 0,
      source: "stopwatch",
    });
    expect(recordCrossedMilestonesMock).not.toHaveBeenCalled();
  });

  it("still awards coins/XP normally (economy is skill-agnostic)", async () => {
    const result = await saveSession({
      userId: "u1",
      skillId: null,
      startedAt: Date.now(),
      durationMin: 15,
      quality: 4,
      note: null,
      pomodoros: 0,
      source: "stopwatch",
    });
    expect(awardSessionEconomyMock).toHaveBeenCalledWith("u1", 15, 4);
    expect(result.coinsGained).toBe(10);
    expect(result.xpGained).toBe(20);
  });

  it("returns zeroed before/after hours and an empty milestonesCrossed list", async () => {
    const result = await saveSession({
      userId: "u1",
      skillId: null,
      startedAt: Date.now(),
      durationMin: 15,
      quality: null,
      note: null,
      pomodoros: 0,
      source: "stopwatch",
    });
    expect(result.beforeHours).toBe(0);
    expect(result.afterHours).toBe(0);
    expect(result.milestonesCrossed).toEqual([]);
  });
});

describe("saveSession with a real skillId (unchanged behavior)", () => {
  beforeEach(() => {
    txGetMock.mockResolvedValue({ exists: () => true, data: () => ({ totalMinutes: 120 }) });
  });

  it("runs the skill transaction, bumps totalMinutes, and records milestones", async () => {
    const result = await saveSession({
      userId: "u1",
      skillId: "skill-1",
      startedAt: Date.now(),
      durationMin: 30,
      quality: 5,
      note: null,
      pomodoros: 1,
      source: "timer",
    });

    expect(runTransactionMock).toHaveBeenCalledTimes(1);
    expect(txGetMock).toHaveBeenCalled();
    expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ __path: "skills/skill-1" }), { totalMinutes: 150 });
    expect(setDocMock).not.toHaveBeenCalled();
    expect(recordCrossedMilestonesMock).toHaveBeenCalledWith("u1", "skill-1", 2, 2.5);
    expect(result.milestonesCrossed).toEqual([1]);
  });

  it("throws if the skill doc doesn't exist", async () => {
    txGetMock.mockResolvedValue({ exists: () => false, data: () => ({}) });
    await expect(
      saveSession({
        userId: "u1",
        skillId: "missing-skill",
        startedAt: Date.now(),
        durationMin: 10,
        quality: null,
        note: null,
        pomodoros: 0,
        source: "manual",
      }),
    ).rejects.toThrow("Skill not found");
  });
});

describe("deleteSession with skillId: null", () => {
  it("deletes only the session doc, with no skill transaction", async () => {
    await deleteSession("session-1", null, 20);
    expect(deleteDocMock).toHaveBeenCalledWith(expect.objectContaining({ __path: "sessions/session-1" }));
    expect(runTransactionMock).not.toHaveBeenCalled();
  });
});

describe("deleteSession with a real skillId (unchanged behavior)", () => {
  it("reverses the skill's totalMinutes inside a transaction", async () => {
    txGetMock.mockResolvedValue({ exists: () => true, data: () => ({ totalMinutes: 100 }) });
    await deleteSession("session-1", "skill-1", 20);
    expect(runTransactionMock).toHaveBeenCalledTimes(1);
    expect(txDeleteMock).toHaveBeenCalled();
    expect(txUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ __path: "skills/skill-1" }), { totalMinutes: 80 });
    expect(deleteDocMock).not.toHaveBeenCalled();
  });
});
