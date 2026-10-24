import { getLesson } from "../lib/curriculum";
import { type PublicAuthClient, takeRpcTransport } from "../lib/supabase";
import { z } from "../lib/zod-config";
import { receiptFor, rememberReceipt } from "./receipts";
import {
  acknowledge,
  type ErrorKind,
  enqueue,
  getOfflineSession,
  hasRejectedOutcome,
  type Intent,
  type IntentKind,
  lease,
  listIntents,
  markRetry,
  outcome,
  readSnapshot,
  retryInfo,
  writeSnapshot,
} from "./store";
export class PendingSyncError extends Error {
  constructor(public readonly reason = "pending") {
    super("Cloud result unconfirmed");
  }
}
export function classifyError(error: unknown): ErrorKind {
  if (!error || typeof error !== "object") return "unknown";
  const value = error as Record<string, unknown>;
  const status = Number(value.status ?? value.statusCode);
  const code = String(value.code ?? "");
  if (status === 401 || status === 403 || code === "42501") return "auth";
  if (code === "22023") return "conflict";
  if (
    status === 429 ||
    status >= 500 ||
    value.name === "AbortError" ||
    value.name === "TimeoutError" ||
    /fetch|network|timeout|connection/i.test(String(value.message ?? ""))
  )
    return "transient";
  return "unknown";
}
let verifier: (() => Promise<boolean>) | null = null;
export function setDispatchVerifier(value: (() => Promise<boolean>) | null) {
  verifier = value;
}
let running = false;
const common = {
  event_id: z.uuid(),
  xp_awarded: z.number().int().nonnegative(),
  total_xp: z.number().int().nonnegative(),
};
function validateReceipt(event: Intent, value: unknown) {
  if (event.kind === "completion") {
    const data = z
      .object({
        ...common,
        lesson_slug: z.string(),
        correct_count: z.number().int().nonnegative(),
        answer_count: z.number().int().positive(),
        accuracy: z.number().min(0).max(1),
        completed: z.boolean(),
        completed_lesson_slugs: z.array(z.string()),
      })
      .passthrough()
      .parse(value);
    if (
      data.event_id !== event.args.p_event_id ||
      data.lesson_slug !== event.args.p_lesson_slug ||
      data.answer_count !== event.args.p_answers.length ||
      data.correct_count > data.answer_count
    )
      throw new Error("Invalid completion receipt");
    return data;
  }
  if (event.kind === "review") {
    const data = z
      .object({
        ...common,
        word_id: z.uuid(),
        modality: z.string(),
        correct: z.boolean(),
        grade: z.number().int().min(0).max(5),
        schedule: z.object({
          ease_factor: z.coerce.number().min(1.3).max(5),
          repetitions: z.number().int().nonnegative(),
          interval_days: z.number().int().min(0).max(36500),
          due_at: z
            .string()
            .datetime({ offset: true })
            .transform((value) => new Date(value).toISOString()),
          version: z.number().int().positive(),
        }),
      })
      .passthrough()
      .parse(value);
    if (
      data.event_id !== event.args.p_event_id ||
      data.word_id !== event.args.p_word_id ||
      data.modality !== event.args.p_modality ||
      data.schedule.version !== event.args.p_expected_version + 1
    )
      throw new Error("Invalid review receipt");
    return data;
  }
  const data = z
    .object({
      ...common,
      unit_slug: z.string(),
      accuracy: z.number().min(0).max(1),
      passed: z.boolean(),
      completed_lesson_slugs: z.array(z.string()),
    })
    .passthrough()
    .parse(value);
  if (
    data.event_id !== event.args.p_event_id ||
    data.unit_slug !== event.args.p_unit_slug
  )
    throw new Error("Invalid test receipt");
  return data;
}
function mergeReceipt(event: Intent, data: ReturnType<typeof validateReceipt>) {
  const snapshot = readSnapshot();
  if (event.kind === "completion" && data.completed === true) {
    const lesson = getLesson(event.args.p_lesson_slug);
    if (lesson?.content_version === event.args.p_content_version)
      writeSnapshot({
        completed: [
          ...(snapshot?.completed ?? []).filter(
            (row) => row.lessonSlug !== lesson.id,
          ),
          { lessonSlug: lesson.id, contentVersion: lesson.content_version },
        ],
      });
  } else if (event.kind === "testout" && data.passed === true) {
    const rows = event.args.p_answers.flatMap((answer) => {
      const lesson = getLesson(answer.lesson_slug);
      return lesson && lesson.content_version === event.args.p_content_version
        ? [{ lessonSlug: lesson.id, contentVersion: lesson.content_version }]
        : [];
    });
    const ids = new Set(rows.map((row) => row.lessonSlug));
    writeSnapshot({
      completed: [
        ...(snapshot?.completed ?? []).filter(
          (row) => !ids.has(row.lessonSlug),
        ),
        ...rows.filter(
          (row, index) =>
            rows.findIndex((value) => value.lessonSlug === row.lessonSlug) ===
            index,
        ),
      ],
    });
  } else if (event.kind === "review" && "schedule" in data) {
    const schedule = z
      .object({ version: z.number(), due_at: z.string() })
      .parse(data.schedule);
    writeSnapshot({
      reviews: (snapshot?.reviews ?? []).map((row) =>
        row.wordId === event.args.p_word_id &&
        row.modality === event.args.p_modality
          ? { ...row, version: schedule.version, dueAt: schedule.due_at }
          : row,
      ),
    });
  }
}
export async function sendIntent(
  client: PublicAuthClient,
  event: Intent,
  force = false,
) {
  if (hasRejectedOutcome()) throw new PendingSyncError("conflict");
  if (document.visibilityState === "hidden" || !navigator.onLine)
    throw new PendingSyncError();
  const token = lease();
  if (
    !token ||
    token.session.ownerId !== event.ownerId ||
    token.session.sessionId !== event.sessionId ||
    outcome(event)
  )
    throw new PendingSyncError("resolved");
  const retry = retryInfo(event);
  if (
    (retry.errorKind === "transient" && retry.nextAttemptAt > Date.now()) ||
    (!force && retry.errorKind !== "transient")
  )
    throw new PendingSyncError("paused");
  if (!verifier || !(await verifier()) || !token.valid() || outcome(event))
    throw new PendingSyncError("verification");
  try {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request =
      event.kind === "completion"
        ? client.rpc("complete_lesson", event.args)
        : event.kind === "review"
          ? client.rpc("review_word", event.args)
          : client.rpc("test_out_unit", event.args);
    let response: Awaited<typeof request>;
    try {
      response = await Promise.race([
        request.abortSignal(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new DOMException("RPC timeout", "TimeoutError"));
          }, 8000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (!token.valid()) throw new PendingSyncError("expired");
    if (outcome(event)) throw new PendingSyncError("resolved");
    if (response.error) {
      const transport = takeRpcTransport(client, event.args.p_event_id);
      const kind = classifyError({
        ...response.error,
        status: response.status ?? transport?.status,
      });
      if (kind === "conflict") {
        acknowledge(event, "rejected", "version-or-prerequisite");
      } else markRetry(event, kind, transport?.retryAt ?? 0);
      throw new PendingSyncError(kind);
    }
    let data: ReturnType<typeof validateReceipt>;
    try {
      data = validateReceipt(event, response.data);
    } catch {
      markRetry(event, "invalid");
      throw new PendingSyncError("invalid");
    }
    if (!token.valid()) throw new PendingSyncError("expired");
    mergeReceipt(event, data);
    if (!token.valid()) throw new PendingSyncError("expired");
    rememberReceipt(event, data, token);
    if (!token.valid() || !acknowledge(event, "accepted", "confirmed"))
      throw new PendingSyncError("expired");
    return data;
  } catch (error) {
    if (error instanceof PendingSyncError) throw error;
    if (token.valid()) markRetry(event, classifyError(error));
    throw new PendingSyncError(classifyError(error));
  }
}
const sessionDispatches = new Map<string, Promise<unknown>>();
async function dispatchSession(
  client: PublicAuthClient,
  target?: Intent,
  force = false,
) {
  const session = getOfflineSession();
  if (!session) throw new PendingSyncError("verification");
  const sessionKey = `${session.ownerId}:${session.sessionId}`;
  const previous = sessionDispatches.get(sessionKey) ?? Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      let result: ReturnType<typeof validateReceipt> | undefined;
      let accepted = 0;
      const run = async () => {
        const captured = lease();
        if (!captured || captured.session.sessionId !== session.sessionId)
          throw new PendingSyncError("expired");
        for (const event of listIntents(session)) {
          if (!captured.valid()) throw new PendingSyncError("expired");
          const isTarget = event.args.p_event_id === target?.args.p_event_id;
          result = await sendIntent(client, event, isTarget && force);
          accepted++;
          if (isTarget) return;
        }
      };
      if (navigator.locks)
        await navigator.locks.request(`bm-owner-sync:${sessionKey}`, run);
      else await run();
      if (target) {
        if (outcome(target)?.state !== "accepted")
          throw new PendingSyncError("pending");
        return result ?? receiptFor(target.args.p_event_id, target.kind);
      }
      return accepted;
    });
  sessionDispatches.set(sessionKey, work);
  try {
    return await work;
  } finally {
    if (sessionDispatches.get(sessionKey) === work)
      sessionDispatches.delete(sessionKey);
  }
}
export async function queueMutation(
  kind: IntentKind,
  args: unknown,
  client: PublicAuthClient | null,
  force = false,
) {
  const event = enqueue(kind, args);
  if (!client) throw new PendingSyncError();
  return dispatchSession(client, event, force);
}
export async function drainQueue(client: PublicAuthClient) {
  if (
    running ||
    document.visibilityState === "hidden" ||
    !navigator.onLine ||
    hasRejectedOutcome()
  )
    return;
  const session = getOfflineSession();
  if (!session || !listIntents(session).length) return;
  running = true;
  try {
    const count = await dispatchSession(client);
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  } finally {
    running = false;
  }
}
