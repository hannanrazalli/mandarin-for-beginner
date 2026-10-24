import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { SESSION_STARTED_KEY } from "../auth/session";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import { fetchReviewSchedules } from "../reviews/cloud";
import { queueMutation, sendIntent, setDispatchVerifier } from "./dispatch";
import {
  beginCredentialLogin,
  captureMarkerGuard,
  enqueue,
  eventOutcome,
  LOGIN_REQUIRED_KEY,
  markRetry,
  readSnapshot,
  restoreOwnerSession,
  setOfflineSession,
  verifyMarker,
  writeSnapshot,
} from "./store";

const owner = "11111111-1111-4111-8111-111111111111";
const word = "22222222-2222-4222-8222-222222222222";
function setup() {
  sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now() - 1000));
  const value = verifyMarker(owner);
  if (!value) throw new Error("Marker fixture");
  return value;
}
function payload(index = 0) {
  const lesson = lessons[index];
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
  setDispatchVerifier(async () => true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function Probe() {
  const auth = useAuth();
  return <p>{auth.status}</p>;
}
function clientWithUser(getUser: () => Promise<unknown>, from = vi.fn()) {
  return {
    auth: {
      getUser,
      getSession: async () => ({
        data: { session: { access_token: "mock-token" } },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      stopAutoRefresh: async () => {},
      admin: { signOut: async () => ({ error: null }) },
    },
    from,
  } as unknown as PublicAuthClient;
}
describe("A07 epoch revocation", () => {
  it("rejects a stale raw marker after reload and requires explicit credentials to create another marker", async () => {
    const marker = setup();
    localStorage.setItem(`bm-owner-epoch:${owner}`, crypto.randomUUID());
    setOfflineSession(null);
    expect(() => verifyMarker(owner)).toThrow("credential");
    const getUser = vi.fn(async () => ({
      data: { user: { id: owner, email_confirmed_at: "confirmed" } },
      error: null,
    }));
    render(
      <AuthProvider client={clientWithUser(getUser)}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText("blocked")).toBeTruthy());
    expect(getUser).not.toHaveBeenCalled();
    expect(restoreOwnerSession()).toBeNull();
    expect(sessionStorage.getItem(LOGIN_REQUIRED_KEY)).toBe("1");
    expect(() => verifyMarker(owner)).toThrow();
    beginCredentialLogin();
    sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    const replacement = verifyMarker(owner);
    expect(replacement?.ownerEpoch).not.toBe(marker.ownerEpoch);
  });
  it("rejects epoch rotation during delayed verification without issuing a profile read", async () => {
    setup();
    let resolve: (value: unknown) => void = () => {};
    const pending = new Promise((done) => {
      resolve = done;
    });
    const getUser = vi.fn(() => pending);
    const from = vi.fn();
    render(
      <AuthProvider client={clientWithUser(getUser, from)}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(getUser).toHaveBeenCalled());
    localStorage.setItem(`bm-owner-epoch:${owner}`, crypto.randomUUID());
    await act(async () =>
      resolve({
        data: { user: { id: owner, email_confirmed_at: "confirmed" } },
        error: null,
      }),
    );
    await waitFor(() => expect(screen.getByText("blocked")).toBeTruthy());
    expect(from).not.toHaveBeenCalled();
    expect(restoreOwnerSession()).toBeNull();
    expect(sessionStorage.getItem(LOGIN_REQUIRED_KEY)).toBe("1");
  });
  it("keeps the original marker guard invalid after a shared epoch changes", () => {
    setup();
    const guard = captureMarkerGuard();
    localStorage.setItem(`bm-owner-epoch:${owner}`, crypto.randomUUID());
    expect(guard.valid()).toBe(false);
    expect(() => verifyMarker(owner, guard)).toThrow();
  });
});
describe("PostgreSQL offset dates and ordered replay", () => {
  it("accepts +00:00 snapshot dates and acknowledges a committed review receipt", async () => {
    setup();
    writeSnapshot({
      reviews: [
        {
          wordId: word,
          wordSlug: "w001",
          modality: "meaning",
          version: 1,
          dueAt: "2026-01-01T00:00:00+00:00",
        },
      ],
    });
    expect(readSnapshot()?.reviews[0].dueAt).toBe("2026-01-01T00:00:00.000Z");
    const args = {
      p_event_id: crypto.randomUUID(),
      p_word_id: word,
      p_modality: "meaning",
      p_answer: "awak",
      p_expected_version: 1,
      p_hints_used: 0,
      p_duration_seconds: 0,
    };
    const event = enqueue("review", args);
    const client = {
      rpc: () => ({
        abortSignal: async () => ({
          data: {
            event_id: args.p_event_id,
            word_id: word,
            modality: "meaning",
            correct: true,
            grade: 5,
            xp_awarded: 5,
            total_xp: 5,
            schedule: {
              ease_factor: 2.6,
              repetitions: 1,
              interval_days: 1,
              due_at: "2027-01-01T00:00:00+00:00",
              version: 2,
            },
          },
          error: null,
          status: 200,
        }),
      }),
    } as unknown as PublicAuthClient;
    await sendIntent(client, event);
    expect(eventOutcome(args.p_event_id)?.state).toBe("accepted");
    expect(readSnapshot()?.reviews[0].dueAt).toBe("2027-01-01T00:00:00.000Z");
  });
  it("sends an older prerequisite before an immediately submitted dependent completion", async () => {
    setup();
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const first = payload(0);
    enqueue("completion", first);

    const second = payload(1);
    const sent: string[] = [];
    const client = {
      rpc: (_name: string, args: ReturnType<typeof payload>) => ({
        abortSignal: async () => {
          sent.push(args.p_event_id);
          return {
            error: null,
            status: 200,
            data: {
              event_id: args.p_event_id,
              lesson_slug: args.p_lesson_slug,
              correct_count: args.p_answers.length,
              answer_count: args.p_answers.length,
              accuracy: 1,
              completed: true,
              xp_awarded: 10,
              total_xp: sent.length * 10,
              completed_lesson_slugs:
                sent.length === 1
                  ? [first.p_lesson_slug]
                  : [first.p_lesson_slug, second.p_lesson_slug],
            },
          };
        },
      }),
    } as unknown as PublicAuthClient;
    await queueMutation("completion", second, client);
    expect(sent).toEqual([first.p_event_id, second.p_event_id]);
    expect(eventOutcome(first.p_event_id)?.state).toBe("accepted");
    expect(eventOutcome(second.p_event_id)?.state).toBe("accepted");
  });
  it("manual force revalidates a paused immutable completion while auto dispatch stays paused", async () => {
    setup();
    const args = payload();
    const event = enqueue("completion", args);
    markRetry(event, "unknown");
    const verify = vi.fn(async () => true);
    setDispatchVerifier(verify);
    const rpc = vi.fn((_name: string, value: typeof args) => ({
      abortSignal: async () => ({
        error: null,
        status: 200,
        data: {
          event_id: value.p_event_id,
          lesson_slug: value.p_lesson_slug,
          correct_count: value.p_answers.length,
          answer_count: value.p_answers.length,
          accuracy: 1,
          completed: true,
          xp_awarded: 10,
          total_xp: 10,
          completed_lesson_slugs: [value.p_lesson_slug],
        },
      }),
    }));
    const client = { rpc } as unknown as PublicAuthClient;
    await expect(queueMutation("completion", args, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    await queueMutation("completion", args, client, true);
    expect(verify).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][1]).toEqual(args);
  });
});
describe("complete review pagination", () => {
  it("reads all 1200 ordered schedule rows and snapshots the final page", async () => {
    setup();
    const rows = Array.from({ length: 1200 }, (_, index) => ({
      word_id: `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`,
      modality: "meaning",
      ease_factor: 2.5,
      repetitions: 0,
      interval_days: 0,
      due_at: "2026-01-01T00:00:00+00:00",
      version: 1,
      last_reviewed_at: null,
    }));
    const ranges: number[][] = [];
    const orders: string[] = [];
    const client = {
      from: () => ({
        select: () => ({
          eq: () => {
            const query = {
              order: (column: string) => {
                orders.push(column);
                return query;
              },
              range: (start: number, end: number) => {
                ranges.push([start, end]);
                return {
                  abortSignal: async () => ({
                    data: rows.slice(start, end + 1),
                    error: null,
                  }),
                };
              },
            };
            return query;
          },
        }),
      }),
    } as unknown as PublicAuthClient;
    const result = await fetchReviewSchedules(
      client,
      owner,
      new AbortController().signal,
    );
    expect(result.data).toHaveLength(1200);
    expect(ranges).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
    expect(orders).toEqual([
      "word_id",
      "modality",
      "word_id",
      "modality",
      "word_id",
      "modality",
    ]);
    writeSnapshot({
      reviews: result.data.map((row, index) => ({
        wordId: row.word_id,
        wordSlug: `w${index + 1}`,
        modality: row.modality,
        version: row.version,
        dueAt: row.due_at,
      })),
    });
    expect(readSnapshot()?.reviews).toHaveLength(1200);
  });
});
