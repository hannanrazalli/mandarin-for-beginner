export const MAX_APP_SESSION_MS = 12 * 60 * 60 * 1000;
export const SESSION_STARTED_KEY = "bm-auth-started-at";
export function remainingAppSession(
  storage: Pick<Storage, "getItem"> = sessionStorage,
  now = Date.now(),
) {
  try {
    const raw = storage.getItem(SESSION_STARTED_KEY);
    if (!raw) return 0;
    const started = Number(raw);
    if (!Number.isFinite(started) || started <= 0 || started > now) return 0;
    return Math.max(0, MAX_APP_SESSION_MS - (now - started));
  } catch {
    return 0;
  }
}
export function startAppSession(
  storage: Pick<Storage, "setItem"> = sessionStorage,
  now = Date.now(),
) {
  storage.setItem(SESSION_STARTED_KEY, String(now));
}
