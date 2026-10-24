import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_APP_SESSION_MS, SESSION_STARTED_KEY } from "../auth/session";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import { classifyError, sendIntent, setDispatchVerifier } from "./dispatch";
import {
  acknowledge,
  enqueue,
  getOfflineSession,
  lease,
  listIntents,
  MARKER_KEY,
  outcome,
  provisionalCompleted,
  purgeOfflineOwner,
  readSnapshot,
  restoreOwnerSession,
  retryInfo,
  setOfflineSession,
  verifyMarker,
  writeSnapshot,
} from "./store";

const owner = "11111111-1111-4111-8111-111111111111";
function setup() {
  sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now() - 1000));
  const marker = verifyMarker(owner);
  if (!marker) throw new Error("Marker fixture");
  return marker;
}
function args() {
  const lesson = lessons[0];
  return {
    p_event_id: crypto.randomUUID(),
    p_lesson_slug: lesson.id,
    p_content_version: lesson.content_version,
    p_answers: lesson.items.map((item) => ({
      item_id: item.id,
      answer: canonicalAnswer(item),
    })),
    p_duration_seconds: 60,
  };
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setOfflineSession(null);
  setDispatchVerifier(null);
});
describe("bounded owner intent storage", () => {
  it("does not restore ownership from an SDK cache or corrupt/future markers", () => {
    sessionStorage.setItem("bm-auth-session", "cached-user");
    expect(restoreOwnerSession()).toBeNull();
    const marker = setup();
    sessionStorage.setItem(
      MARKER_KEY,
      JSON.stringify({ ...marker, verifiedAt: Date.now() + 100000 }),
    );
    expect(restoreOwnerSession()).toBeNull();
  });
  it("retains immutable IDs/payload on reload and derives provisional unlocks only from pending valid answers", () => {
    const marker = setup();
    const payload = args();
    const event = enqueue("completion", payload);
    expect(provisionalCompleted()).toContain(lessons[0].id);
    setOfflineSession(restoreOwnerSession());
    expect(listIntents()[0].args).toEqual(payload);
    expect(enqueue("completion", payload).args.p_event_id).toBe(
      event.args.p_event_id,
    );
    expect(() =>
      enqueue("completion", { ...payload, p_duration_seconds: 61 }),
    ).toThrow("Immutable");
    expect(getOfflineSession()?.expiresAt).toBe(
      marker.startedAt + MAX_APP_SESSION_MS,
    );
  });
  it("keeps outcomes monotonic and removes a rejected parent provisional unlock", () => {
    setup();
    const event = enqueue("completion", args());
    expect(acknowledge(event, "rejected", "conflict")).toBe(true);
    expect(acknowledge(event, "accepted", "late")).toBe(false);
    expect(outcome(event)?.state).toBe("rejected");
    expect(provisionalCompleted()).not.toContain(lessons[0].id);
    expect(listIntents()).toEqual([]);
  });
  it("seals snapshot writes and queue acknowledgments after purge or a cross-tab epoch change", () => {
    const marker = setup();
    const captured = lease();
    const event = enqueue("completion", args());
    writeSnapshot({
      completed: [{ lessonSlug: lessons[0].id, contentVersion: 1 }],
    });
    purgeOfflineOwner();
    expect(captured?.valid()).toBe(false);
    expect(writeSnapshot({ completed: [] }, captured)).toBe(false);
    expect(acknowledge(event, "accepted", "late")).toBe(false);
    expect(readSnapshot()).toBeNull();
    expect(listIntents()).toEqual([]);
    expect(localStorage.getItem(`bm-owner-epoch:${marker.ownerId}`)).not.toBe(
      marker.ownerEpoch,
    );
  });
  it("rejects duplicate items, unavailable storage, oversized answers and expired markers", () => {
    setup();
    const payload = args();
    expect(() =>
      enqueue("completion", {
        ...payload,
        p_answers: [payload.p_answers[0], payload.p_answers[0]],
      }),
    ).toThrow();
    expect(() =>
      enqueue("completion", {
        ...payload,
        p_answers: [{ item_id: "item", answer: "x".repeat(2001) }],
      }),
    ).toThrow();
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Quota", "QuotaExceededError");
      });
    expect(() => enqueue("completion", payload)).toThrow();
    spy.mockRestore();
    sessionStorage.setItem(
      SESSION_STARTED_KEY,
      String(Date.now() - MAX_APP_SESSION_MS),
    );
    expect(restoreOwnerSession()).toBeNull();
  });
  it("requires an exact verified schedule snapshot and only one pending review per version", () => {
    setup();
    const wordId = crypto.randomUUID();
    const payload = {
      p_event_id: crypto.randomUUID(),
      p_word_id: wordId,
      p_modality: "meaning",
      p_answer: "awak",
      p_expected_version: 1,
      p_hints_used: 0,
      p_duration_seconds: 0,
    };
    expect(() => enqueue("review", payload)).toThrow("snapshot");
    writeSnapshot({
      reviews: [
        {
          wordId,
          wordSlug: "w001",
          modality: "meaning",
          version: 1,
          dueAt: new Date(Date.now() - 1).toISOString(),
        },
      ],
    });
    enqueue("review", payload);
    expect(() =>
      enqueue("review", { ...payload, p_event_id: crypto.randomUUID() }),
    ).toThrow("already pending");
  });
});
describe("leased dispatcher", () => {
  it("does not let a late RPC receipt revive purged data", async () => {
    setup();
    const event = enqueue("completion", args());
    let resolve: (value: unknown) => void = () => {};
    const response = new Promise((done) => {
      resolve = done;
    });
    const rpc = vi.fn(() => ({ abortSignal: () => response }));
    const client = { rpc } as unknown as PublicAuthClient;
    setDispatchVerifier(async () => true);
    const sent = sendIntent(client, event).catch((error) => error);
    await Promise.resolve();
    await Promise.resolve();
    purgeOfflineOwner();
    resolve({
      data: {
        event_id: event.args.p_event_id,
        lesson_slug: lessons[0].id,
        correct_count: 3,
        answer_count: 3,
        accuracy: 1,
        completed: true,
        xp_awarded: 10,
        total_xp: 10,
        completed_lesson_slugs: [lessons[0].id],
      },
      error: null,
    });
    await sent;
    expect(readSnapshot()).toBeNull();
    expect(outcome(event)).toBeNull();
    expect(listIntents()).toEqual([]);
  });
  it("classifies retryable failures and records a durable retry clock", async () => {
    setup();
    const event = enqueue("completion", args());
    const client = {
      rpc: () => ({
        abortSignal: async () => ({
          data: null,
          error: { status: 503, message: "unavailable" },
        }),
      }),
    } as unknown as PublicAuthClient;
    setDispatchVerifier(async () => true);
    await expect(sendIntent(client, event)).rejects.toThrow();
    expect(retryInfo(event).nextAttemptAt).toBeGreaterThan(Date.now());
    expect(listIntents()[0].args.p_event_id).toBe(event.args.p_event_id);
    expect(classifyError({ code: "22023" })).toBe("conflict");
    expect(classifyError({ status: 403 })).toBe("auth");
  });
});
