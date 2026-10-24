import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyOwnerResult } from "../auth/owner";
import { purgeAccountData } from "../auth/purge";
import { MAX_APP_SESSION_MS, SESSION_STARTED_KEY } from "../auth/session";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import { receiptFor, rememberReceipt } from "./receipts";
import {
  acknowledge,
  captureOfflinePurgeTarget,
  discardPendingAndAcknowledgeRejections,
  enqueue,
  eventOutcome,
  hasRejectedOutcome,
  lease,
  listIntents,
  MARKER_KEY,
  markRetry,
  purgeOfflineOwner,
  restoreOwnerSession,
  retryInfo,
  setOfflineSession,
  verifyMarker,
} from "./store";
import { createRpcTransport, retryAfterDeadline } from "./transport";

const owner = "11111111-1111-4111-8111-111111111111";
function setup() {
  sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now() - 1000));
  const marker = verifyMarker(owner);
  if (!marker) throw new Error("Invalid marker fixture");
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
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("explicit conflict resolution", () => {
  it("preserves outcomes, discards dependent intents and acknowledges only known rejections", () => {
    setup();
    const rejected = enqueue("completion", args());
    acknowledge(rejected, "rejected", "original-conflict");
    const accepted = enqueue("completion", args());
    acknowledge(accepted, "accepted", "confirmed");
    const dependent = enqueue("completion", args());
    expect(hasRejectedOutcome()).toBe(true);
    discardPendingAndAcknowledgeRejections();
    expect(listIntents()).toEqual([]);
    expect(eventOutcome(rejected.args.p_event_id)?.reason).toBe(
      "original-conflict",
    );
    expect(eventOutcome(accepted.args.p_event_id)?.state).toBe("accepted");
    expect(eventOutcome(dependent.args.p_event_id)?.reason).toBe(
      "discarded-by-user",
    );
    expect(hasRejectedOutcome()).toBe(false);
    const later = enqueue("completion", args());
    acknowledge(later, "rejected", "new-conflict");
    expect(hasRejectedOutcome()).toBe(true);
  });
});
describe("receipt and startup purge leases", () => {
  it("exposes validated receipts only while their lease remains live and clears on logout purge", async () => {
    setup();
    const event = enqueue("completion", args());
    const token = lease();
    if (!token) throw new Error("Lease fixture");
    const receipt = { event_id: event.args.p_event_id, xp_awarded: 10 };
    expect(rememberReceipt(event, receipt, token)).toBe(true);
    acknowledge(event, "accepted", "confirmed");
    expect(receiptFor(event.args.p_event_id, "completion")).toEqual(receipt);
    await purgeAccountData();
    expect(receiptFor(event.args.p_event_id, "completion")).toBeNull();
    expect(rememberReceipt(event, receipt, token)).toBe(false);
  });
  it("purges expired queues on cold startup even when marker restoration rejects them", () => {
    vi.useFakeTimers();
    const marker = setup();
    const event = enqueue("completion", args());
    setOfflineSession(null);
    vi.advanceTimersByTime(MAX_APP_SESSION_MS + 1);
    expect(restoreOwnerSession()).toBeNull();
    purgeOfflineOwner();
    expect(
      Object.keys(localStorage).some((key) =>
        key.endsWith(event.args.p_event_id),
      ),
    ).toBe(false);
    expect(localStorage.getItem(`bm-owner-epoch:${owner}`)).not.toBe(
      marker.ownerEpoch,
    );
  });
  it("retains a captured startup marker across auth adapter sealing", () => {
    const marker = setup();
    enqueue("completion", args());
    setOfflineSession(null);
    captureOfflinePurgeTarget(marker);
    sessionStorage.removeItem(MARKER_KEY);
    purgeOfflineOwner();
    expect(listIntents()).toEqual([]);
    expect(
      Object.keys(localStorage).some((key) =>
        key.startsWith("bm-owner-event:"),
      ),
    ).toBe(false);
    expect(localStorage.getItem(`bm-owner-epoch:${owner}`)).not.toBe(
      marker.ownerEpoch,
    );
  });
});
describe("bounded header-only RPC telemetry", () => {
  it("records only event ID/status/deadline and honors a bounded Retry-After clock", async () => {
    const eventId = crypto.randomUUID();
    const now = Date.now();
    const transport = createRpcTransport(
      vi.fn(
        async () =>
          new Response("{}", {
            status: 429,
            headers: { "Retry-After": "99999" },
          }),
      ),
    );
    await transport.fetch(
      "https://example.supabase.co/rest/v1/rpc/complete_lesson",
      {
        method: "POST",
        body: JSON.stringify({
          p_event_id: eventId,
          p_answers: [{ answer: "not retained" }],
        }),
        headers: { Authorization: "Bearer not-retained" },
      },
    );
    const value = transport.take(eventId);
    expect(value && Object.keys(value).sort()).toEqual([
      "eventId",
      "retryAt",
      "status",
    ]);
    expect(value?.status).toBe(429);
    expect(value?.retryAt).toBeGreaterThanOrEqual(now + 299000);
    expect(value?.retryAt).toBeLessThanOrEqual(Date.now() + 300000);
    setup();
    const event = enqueue("completion", args());
    markRetry(event, "transient", value?.retryAt);
    expect(retryInfo(event).nextAttemptAt).toBeGreaterThanOrEqual(now + 299000);
    expect(retryAfterDeadline("-1", now)).toBe(0);
  });
  it("sealing prevents a late fetch from restoring telemetry", async () => {
    let resolve: (response: Response) => void = () => {};
    const pending = new Promise<Response>((done) => {
      resolve = done;
    });
    const transport = createRpcTransport(vi.fn(() => pending));
    const eventId = crypto.randomUUID();
    const request = transport.fetch(
      "https://example.supabase.co/rest/v1/rpc/review_word",
      { body: JSON.stringify({ p_event_id: eventId }) },
    );
    transport.seal();
    resolve(new Response("{}", { status: 503 }));
    await request;
    expect(transport.take(eventId)).toBeNull();
  });
});
describe("bounded owner verification", () => {
  it("times out getUser and ignores a late user before querying the profile", async () => {
    vi.useFakeTimers();
    let resolve: (result: unknown) => void = () => {};
    const delayed = new Promise((done) => {
      resolve = done;
    });
    const from = vi.fn();
    const client = {
      auth: { getUser: () => delayed },
      from,
    } as unknown as PublicAuthClient;
    const verification = verifyOwnerResult(client);
    await vi.advanceTimersByTimeAsync(8001);
    expect(await verification).toEqual({ kind: "unavailable" });
    resolve({
      data: { user: { id: owner, email_confirmed_at: "confirmed" } },
      error: null,
    });
    await Promise.resolve();
    expect(from).not.toHaveBeenCalled();
  });
  it("aborts a hung profile read when the shared deadline expires", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: owner, email_confirmed_at: "confirmed" } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            abortSignal: (value: AbortSignal) => {
              signal = value;
              return { maybeSingle: () => new Promise(() => {}) };
            },
          }),
        }),
      }),
    } as unknown as PublicAuthClient;
    const verification = verifyOwnerResult(client);
    await vi.advanceTimersByTimeAsync(8001);
    expect(await verification).toEqual({ kind: "unavailable" });
    expect(signal?.aborted).toBe(true);
  });
});
