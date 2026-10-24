import { registerAccountPurger } from "../auth/purge";
import { MAX_APP_SESSION_MS, SESSION_STARTED_KEY } from "../auth/session";
import { canonicalAnswer, getLesson, lessons } from "../lib/curriculum";
import { z } from "../lib/zod-config";

const uuid = z.uuid();
const stamp = z.number().int().nonnegative();
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const answer = z.string().max(2000);
export const ownerSessionSchema = z
  .object({
    v: z.literal(1),
    ownerId: uuid,
    sessionId: uuid,
    ownerEpoch: uuid,
    startedAt: stamp,
    verifiedAt: stamp,
    expiresAt: stamp,
  })
  .strict();
export type VerifiedOwnerSession = z.infer<typeof ownerSessionSchema>;
const duration = z.number().int().min(0).max(600);
const answers = z
  .array(z.object({ item_id: slug, answer }).strict())
  .min(1)
  .max(200)
  .refine(
    (rows) => new Set(rows.map((row) => row.item_id)).size === rows.length,
  );
const completion = z
  .object({
    p_event_id: uuid,
    p_lesson_slug: slug,
    p_content_version: z.number().int().positive(),
    p_answers: answers,
    p_duration_seconds: duration,
  })
  .strict();
const review = z
  .object({
    p_event_id: uuid,
    p_word_id: uuid,
    p_modality: z.enum(["meaning", "listening", "tone", "hanzi"]),
    p_answer: answer,
    p_expected_version: z.number().int().positive(),
    p_hints_used: z.number().int().min(0).max(2),
    p_duration_seconds: duration,
  })
  .strict();
const testout = z
  .object({
    p_event_id: uuid,
    p_unit_slug: slug,
    p_content_version: z.number().int().positive(),
    p_answers: z
      .array(z.object({ lesson_slug: slug, item_id: slug, answer }).strict())
      .min(1)
      .max(200)
      .refine(
        (rows) =>
          new Set(rows.map((row) => `${row.lesson_slug}:${row.item_id}`))
            .size === rows.length,
      ),
    p_duration_seconds: duration,
  })
  .strict();
const base = {
  v: z.literal(1),
  ownerId: uuid,
  sessionId: uuid,
  ownerEpoch: uuid,
  expiresAt: stamp,
  createdAt: stamp,
};
export const intentSchema = z.discriminatedUnion("kind", [
  z
    .object({ ...base, kind: z.literal("completion"), args: completion })
    .strict(),
  z.object({ ...base, kind: z.literal("review"), args: review }).strict(),
  z.object({ ...base, kind: z.literal("testout"), args: testout }).strict(),
]);
export type Intent = z.infer<typeof intentSchema>;
export type IntentKind = Intent["kind"];
export type ErrorKind =
  | "transient"
  | "auth"
  | "conflict"
  | "invalid"
  | "unknown";
const outcomeSchema = z
  .object({
    state: z.enum(["accepted", "rejected"]),
    reason: z.string().max(80),
    expiresAt: stamp,
    ownerEpoch: uuid,
  })
  .strict();
const retrySchema = z
  .object({
    attempts: z.number().int().min(0).max(1000),
    nextAttemptAt: stamp,
    errorKind: z.enum(["transient", "auth", "conflict", "invalid", "unknown"]),
  })
  .strict();
const snapshotSchema = z
  .object({
    v: z.literal(1),
    ownerId: uuid,
    sessionId: uuid,
    ownerEpoch: uuid,
    expiresAt: stamp,
    savedAt: stamp,
    completed: z
      .array(
        z
          .object({
            lessonSlug: slug,
            contentVersion: z.number().int().positive(),
          })
          .strict(),
      )
      .max(2000),
    reviews: z
      .array(
        z
          .object({
            wordId: uuid,
            wordSlug: slug,
            modality: z.enum(["meaning", "listening", "tone", "hanzi"]),
            version: z.number().int().positive(),
            dueAt: z
              .string()
              .datetime({ offset: true })
              .transform((value) => new Date(value).toISOString()),
          })
          .strict(),
      )
      .max(1200),
  })
  .strict();
export type Snapshot = z.infer<typeof snapshotSchema>;
export const MARKER_KEY = "bm-owner-verified:v1";
let current: VerifiedOwnerSession | null = null;
let revision = 0;
const listeners = new Set<() => void>();
export function subscribeOffline(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
let tick = 0;
export function offlineTick() {
  return tick;
}
export function notifyOffline() {
  notify();
}
function notify() {
  tick++;
  for (const listener of listeners) listener();
}
const epochKey = (id: string) => `bm-owner-epoch:${id}`;
const prefix = (
  kind: string,
  s: Pick<VerifiedOwnerSession, "ownerId" | "sessionId">,
) => `bm-owner-${kind}:${s.ownerId}:${s.sessionId}:`;
const snapshotKey = (s: VerifiedOwnerSession) =>
  `bm-owner-snapshot:${s.ownerId}:${s.sessionId}`;
export function liveSession(
  session: VerifiedOwnerSession | null = current,
  now = Date.now(),
) {
  try {
    return (
      !!session &&
      session.startedAt <= session.verifiedAt &&
      session.verifiedAt <= now &&
      now < session.expiresAt &&
      session.expiresAt === session.startedAt + MAX_APP_SESSION_MS &&
      Number(sessionStorage.getItem(SESSION_STARTED_KEY)) ===
        session.startedAt &&
      localStorage.getItem(epochKey(session.ownerId)) === session.ownerEpoch
    );
  } catch {
    return false;
  }
}
export function restoreOwnerSession() {
  try {
    const value = ownerSessionSchema.parse(
      JSON.parse(sessionStorage.getItem(MARKER_KEY) || "null"),
    );
    return liveSession(value) ? value : null;
  } catch {
    return null;
  }
}
export function setOfflineSession(session: VerifiedOwnerSession | null) {
  current = session && liveSession(session) ? session : null;
  revision++;
  notify();
}
export function getOfflineSession() {
  return liveSession() ? current : null;
}
export const LOGIN_REQUIRED_KEY = "bm-owner-login-required:v1";
export function credentialLoginRequired() {
  return sessionStorage.getItem(LOGIN_REQUIRED_KEY) === "1";
}
export function requireCredentialLogin() {
  sessionStorage.setItem(LOGIN_REQUIRED_KEY, "1");
}
export function beginCredentialLogin() {
  sessionStorage.removeItem(LOGIN_REQUIRED_KEY);
  sessionStorage.removeItem(MARKER_KEY);
  setOfflineSession(null);
}
export function captureMarkerGuard() {
  const text = sessionStorage.getItem(MARKER_KEY);
  const original = readOwnerMarker();
  const invalid = !!text && (!original || !liveSession(original));
  return {
    original,
    valid: () => {
      if (invalid || sessionStorage.getItem(LOGIN_REQUIRED_KEY)) return false;
      if (original)
        return (
          liveSession(original) && sessionStorage.getItem(MARKER_KEY) === text
        );
      return sessionStorage.getItem(MARKER_KEY) === null;
    },
  };
}
export function verifyMarker(ownerId: string, guard = captureMarkerGuard()) {
  if (!guard.valid()) throw new Error("Explicit credential login required");
  const startedAt = Number(sessionStorage.getItem(SESSION_STARTED_KEY));
  if (
    !uuid.safeParse(ownerId).success ||
    !Number.isSafeInteger(startedAt) ||
    startedAt <= 0 ||
    startedAt > Date.now() ||
    Date.now() >= startedAt + MAX_APP_SESSION_MS
  )
    return null;
  const old = restoreOwnerSession();
  if (guard.original && guard.original.ownerId !== ownerId)
    throw new Error("Owner marker mismatch");
  let epoch =
    guard.original?.ownerEpoch ?? localStorage.getItem(epochKey(ownerId));
  if (!uuid.safeParse(epoch).success) {
    epoch = crypto.randomUUID();
    localStorage.setItem(epochKey(ownerId), epoch);
  }
  const value = ownerSessionSchema.parse({
    v: 1,
    ownerId,
    sessionId: old?.ownerId === ownerId ? old.sessionId : crypto.randomUUID(),
    ownerEpoch: epoch,
    startedAt,
    verifiedAt: Date.now(),
    expiresAt: startedAt + MAX_APP_SESSION_MS,
  });
  if (!guard.valid()) throw new Error("Explicit credential login required");
  sessionStorage.setItem(MARKER_KEY, JSON.stringify(value));
  if (!liveSession(value)) {
    sessionStorage.removeItem(MARKER_KEY);
    requireCredentialLogin();
    throw new Error("Revoked owner epoch");
  }
  setOfflineSession(value);
  return value;
}
export function lease() {
  const session = getOfflineSession();
  if (!session) return null;
  const captured = revision;
  return {
    session,
    valid: () =>
      captured === revision &&
      current?.sessionId === session.sessionId &&
      liveSession(session),
  };
}
let purgeTarget: VerifiedOwnerSession | null = null;
export function captureOfflinePurgeTarget(
  session: VerifiedOwnerSession | null,
) {
  purgeTarget = session;
}
export function purgeOfflineOwner() {
  const session =
    current ?? purgeTarget ?? restoreOwnerSession() ?? readOwnerMarker();
  purgeTarget = null;
  current = null;
  revision++;
  let failed = false;
  if (session) {
    try {
      localStorage.setItem(epochKey(session.ownerId), crypto.randomUUID());
    } catch {
      failed = true;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        ["event", "retry", "outcome", "resolution"].some((kind) =>
          key.startsWith(`bm-owner-${kind}:${session.ownerId}:`),
        )
      ) {
        try {
          localStorage.removeItem(key);
        } catch {
          failed = true;
        }
      }
    }
  }
  try {
    sessionStorage.removeItem(MARKER_KEY);
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("bm-owner-snapshot:")) sessionStorage.removeItem(key);
    }
  } catch {
    failed = true;
  }
  try {
    collectExpired();
  } catch {
    failed = true;
  }
  notify();
  if (failed) throw new Error("Offline deletion could not be confirmed");
}
registerAccountPurger(purgeOfflineOwner);
function keys(storage: Storage) {
  return Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => !!key);
}
export function collectExpired(now = Date.now()) {
  for (const key of keys(localStorage)) {
    if (!/^bm-owner-(event|outcome|resolution):/.test(key)) continue;
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null") as {
        expiresAt?: number;
      };
      if (
        !value ||
        typeof value.expiresAt !== "number" ||
        value.expiresAt <= now
      ) {
        localStorage.removeItem(key);
        localStorage.removeItem(key.replace(/event:|outcome:/, "retry:"));
      }
    } catch {
      localStorage.removeItem(key);
    }
  }
}
export function listIntents(session = current) {
  if (!session || !liveSession(session)) return [];
  return keys(localStorage)
    .filter((key) => key.startsWith(prefix("event", session)))
    .flatMap((key) => {
      try {
        const event = intentSchema.parse(
          JSON.parse(localStorage.getItem(key) || "null"),
        );
        if (
          !matches(event, session) ||
          key !== prefix("event", session) + event.args.p_event_id ||
          localStorage.getItem(
            prefix("outcome", session) + event.args.p_event_id,
          )
        )
          return [];
        return [event];
      } catch {
        return [];
      }
    })
    .sort(
      (a, b) =>
        a.createdAt - b.createdAt ||
        a.args.p_event_id.localeCompare(b.args.p_event_id),
    );
}
function matches(
  event: {
    ownerId: string;
    sessionId: string;
    ownerEpoch: string;
    expiresAt: number;
  },
  session: VerifiedOwnerSession,
) {
  return (
    event.ownerId === session.ownerId &&
    event.sessionId === session.sessionId &&
    event.ownerEpoch === session.ownerEpoch &&
    event.expiresAt === session.expiresAt
  );
}
export function enqueue(kind: IntentKind, args: unknown) {
  const token = lease();
  if (!token) throw new Error("Verified owner session required");
  const session = token.session;
  collectExpired();
  const event = intentSchema.parse({
    v: 1,
    ownerId: session.ownerId,
    sessionId: session.sessionId,
    ownerEpoch: session.ownerEpoch,
    expiresAt: session.expiresAt,
    createdAt: Math.min(
      session.expiresAt - 1,
      Math.max(Date.now(), (listIntents(session).at(-1)?.createdAt ?? 0) + 1),
    ),
    kind,
    args,
  });
  return persistEvent(event, token);
}
function persistEvent(
  event: Intent,
  token: NonNullable<ReturnType<typeof lease>>,
) {
  const session = token.session;
  if (new TextEncoder().encode(JSON.stringify(event.args)).length > 128 * 1024)
    throw new Error("Answer payload exceeds limit");
  if (
    event.kind === "review" &&
    !readSnapshot(session)?.reviews.some(
      (row) =>
        row.wordId === event.args.p_word_id &&
        row.modality === event.args.p_modality &&
        row.version === event.args.p_expected_version &&
        Date.parse(row.dueAt) <= Date.now(),
    )
  )
    throw new Error("No verified due review snapshot");
  const key = prefix("event", session) + event.args.p_event_id;
  const encoded = JSON.stringify(event);
  const existing = localStorage.getItem(key);
  if (existing) {
    if (existing !== encoded) {
      const stored = intentSchema.parse(JSON.parse(existing));
      if (
        JSON.stringify(stored.args) !== JSON.stringify(event.args) ||
        stored.kind !== event.kind
      )
        throw new Error("Immutable event mismatch");
      return stored;
    }
    return event;
  }
  if (localStorage.getItem(prefix("outcome", session) + event.args.p_event_id))
    throw new Error("Event already resolved");
  if (
    event.kind === "review" &&
    listIntents(session).some(
      (other) =>
        other.kind === "review" &&
        other.args.p_word_id === event.args.p_word_id &&
        other.args.p_modality === event.args.p_modality &&
        other.args.p_expected_version === event.args.p_expected_version,
    )
  )
    throw new Error("Review version already pending");
  const owned = keys(localStorage).filter((value) =>
    new RegExp(`^bm-owner-(event|outcome):${session.ownerId}:`).test(value),
  );
  const byteKeys = keys(localStorage).filter((value) =>
    new RegExp(
      `^bm-owner-(event|outcome|retry|resolution):${session.ownerId}:`,
    ).test(value),
  );
  const bytes = byteKeys.reduce(
    (sum, value) =>
      sum + 2 * (value.length + (localStorage.getItem(value)?.length ?? 0)),
    0,
  );
  if (
    owned.length >= 1000 ||
    bytes + 2 * (key.length + encoded.length) > 2 * 1024 * 1024
  )
    throw new Error("Offline queue is full");
  if (!token.valid()) throw new Error("Owner session expired");
  localStorage.setItem(key, encoded);
  notify();
  return event;
}
export function outcome(event: Intent) {
  try {
    return outcomeSchema.parse(
      JSON.parse(
        localStorage.getItem(
          prefix("outcome", event) + event.args.p_event_id,
        ) || "null",
      ),
    );
  } catch {
    return null;
  }
}
export function acknowledge(
  event: Intent,
  state: "accepted" | "rejected",
  reason: string,
) {
  const token = lease();
  if (!token || !matches(event, token.session) || outcome(event)) return false;
  const value = outcomeSchema.parse({
    state,
    reason,
    expiresAt: event.expiresAt,
    ownerEpoch: event.ownerEpoch,
  });
  if (!token.valid()) return false;
  localStorage.setItem(
    prefix("outcome", event) + event.args.p_event_id,
    JSON.stringify(value),
  );
  localStorage.removeItem(prefix("event", event) + event.args.p_event_id);
  localStorage.removeItem(prefix("retry", event) + event.args.p_event_id);
  notify();
  return true;
}
export function retryInfo(event: Intent) {
  try {
    return retrySchema.parse(
      JSON.parse(
        localStorage.getItem(prefix("retry", event) + event.args.p_event_id) ||
          "null",
      ),
    );
  } catch {
    return { attempts: 0, nextAttemptAt: 0, errorKind: "transient" as const };
  }
}
export function markRetry(event: Intent, errorKind: ErrorKind, retryAt = 0) {
  const token = lease();
  if (!token || !matches(event, token.session) || outcome(event)) return;
  const old = retryInfo(event);
  const attempts = Math.min(1000, old.attempts + 1);
  const delay =
    errorKind === "transient"
      ? Math.min(60000, 1000 * 2 ** Math.min(6, attempts - 1)) +
        Math.floor(Math.random() * 250)
      : 86400000;
  if (token.valid())
    localStorage.setItem(
      prefix("retry", event) + event.args.p_event_id,
      JSON.stringify({
        attempts,
        nextAttemptAt: Math.max(
          Date.now() + delay,
          Math.min(Date.now() + 300000, retryAt),
        ),
        errorKind,
      }),
    );
  notify();
}
export function readSnapshot(session = current) {
  try {
    if (!session || !liveSession(session)) return null;
    const raw = sessionStorage.getItem(snapshotKey(session));
    if (!raw || new TextEncoder().encode(raw).byteLength > 256 * 1024)
      return null;
    const value = snapshotSchema.parse(JSON.parse(raw));
    if (!matches(value, session) || value.savedAt > Date.now()) return null;
    return {
      ...value,
      completed: value.completed.filter(
        (row) =>
          getLesson(row.lessonSlug)?.content_version === row.contentVersion,
      ),
    };
  } catch {
    return null;
  }
}
export function writeSnapshot(
  patch: Partial<Pick<Snapshot, "completed" | "reviews">>,
  token = lease(),
) {
  if (!token?.valid()) return false;
  const session = token.session;
  const old = readSnapshot(session);
  const value = snapshotSchema.parse({
    v: 1,
    ownerId: session.ownerId,
    sessionId: session.sessionId,
    ownerEpoch: session.ownerEpoch,
    expiresAt: session.expiresAt,
    savedAt: Date.now(),
    completed: patch.completed ?? old?.completed ?? [],
    reviews: patch.reviews ?? old?.reviews ?? [],
  });
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).byteLength > 256 * 1024)
    throw new Error("Offline snapshot exceeds limit");
  if (!token.valid()) return false;
  sessionStorage.setItem(snapshotKey(session), json);
  notify();
  return true;
}
const normal = (value: string) => value.trim().toLowerCase();
export function provisionalCompleted() {
  const session = getOfflineSession();
  if (!session) return [];
  const completed = new Set(
    readSnapshot(session)?.completed.map((row) => row.lessonSlug) ?? [],
  );
  for (const event of listIntents(session)) {
    if (event.kind === "completion") {
      const lesson = getLesson(event.args.p_lesson_slug);
      if (!lesson || lesson.content_version !== event.args.p_content_version)
        continue;
      const index = lessons.findIndex((value) => value.id === lesson.id);
      if (!lessons.slice(0, index).every((value) => completed.has(value.id)))
        continue;
      const correct = lesson.items.filter((item) =>
        event.args.p_answers.some(
          (row) =>
            row.item_id === item.id &&
            normal(row.answer) === normal(canonicalAnswer(item)),
        ),
      ).length;
      if (
        event.args.p_answers.length === lesson.items.length &&
        correct / lesson.items.length >= 0.8
      )
        completed.add(lesson.id);
    } else if (
      event.kind === "testout" &&
      event.args.p_unit_slug === "unit-1" &&
      lessons
        .filter((lesson) => lesson.unit === 0)
        .every((lesson) => completed.has(lesson.id))
    ) {
      const unit = lessons.filter((lesson) => lesson.unit === 1);
      const items = unit.flatMap((lesson) =>
        lesson.items.map((item) => ({ lesson, item })),
      );
      const correct = items.filter(({ lesson, item }) =>
        event.args.p_answers.some(
          (row) =>
            row.lesson_slug === lesson.id &&
            row.item_id === item.id &&
            normal(row.answer) === normal(canonicalAnswer(item)),
        ),
      ).length;
      if (
        event.args.p_answers.length === items.length &&
        correct / items.length >= 0.9
      )
        for (const lesson of unit) completed.add(lesson.id);
    }
  }
  return [...completed];
}

export function hasRejectedOutcome() {
  const session = getOfflineSession();
  if (!session) return false;
  return keys(localStorage)
    .filter((key) => key.startsWith(prefix("outcome", session)))
    .some((key) => {
      try {
        return (
          outcomeSchema.parse(JSON.parse(localStorage.getItem(key) || "null"))
            .state === "rejected" &&
          !rejectionAcknowledged(
            key.slice(prefix("outcome", session).length),
            session,
          )
        );
      } catch {
        return true;
      }
    });
}

export function readOwnerMarker() {
  try {
    return ownerSessionSchema.parse(
      JSON.parse(sessionStorage.getItem(MARKER_KEY) || "null"),
    );
  } catch {
    return null;
  }
}
export function eventOutcome(eventId: string | null) {
  const session = getOfflineSession();
  if (!session || !eventId) return null;
  try {
    const value = outcomeSchema.parse(
      JSON.parse(
        localStorage.getItem(prefix("outcome", session) + eventId) || "null",
      ),
    );
    return value.ownerEpoch === session.ownerEpoch &&
      value.expiresAt === session.expiresAt
      ? value
      : null;
  } catch {
    return null;
  }
}
const resolutionSchema = z
  .object({ v: z.literal(1), ownerEpoch: uuid, expiresAt: stamp })
  .strict();
function rejectionAcknowledged(eventId: string, session: VerifiedOwnerSession) {
  try {
    const value = resolutionSchema.parse(
      JSON.parse(
        localStorage.getItem(prefix("resolution", session) + eventId) || "null",
      ),
    );
    return (
      value.ownerEpoch === session.ownerEpoch &&
      value.expiresAt === session.expiresAt
    );
  } catch {
    return false;
  }
}
export function discardPendingAndAcknowledgeRejections() {
  const token = lease();
  if (!token) throw new Error("Owner session unavailable");
  const session = token.session;
  for (const event of listIntents(session)) {
    if (!token.valid()) throw new Error("Expired owner lease");
    acknowledge(event, "rejected", "discarded-by-user");
  }
  for (const key of keys(localStorage).filter((value) =>
    value.startsWith(prefix("outcome", session)),
  )) {
    if (!token.valid()) throw new Error("Expired owner lease");
    const value = outcomeSchema.parse(
      JSON.parse(localStorage.getItem(key) || "null"),
    );
    if (
      value.state === "rejected" &&
      value.ownerEpoch === session.ownerEpoch &&
      value.expiresAt === session.expiresAt
    )
      localStorage.setItem(
        prefix("resolution", session) +
          key.slice(prefix("outcome", session).length),
        JSON.stringify({
          v: 1,
          ownerEpoch: session.ownerEpoch,
          expiresAt: session.expiresAt,
        }),
      );
  }
  notify();
}
