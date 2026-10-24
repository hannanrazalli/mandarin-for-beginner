import { SESSION_STARTED_KEY } from "./session";
export const SESSION_SLOT = "bm-auth-session";
export function createTabAuthStorage(
  storage: Storage,
  channelKey = `bm-auth-${crypto.randomUUID()}`,
) {
  let sealed = false;
  const slot = (key: string) =>
    key === channelKey
      ? SESSION_SLOT
      : key.startsWith(`${channelKey}-`)
        ? `${SESSION_SLOT}${key.slice(channelKey.length)}`
        : null;
  return {
    channelKey,
    adapter: {
      getItem(key: string) {
        const target = slot(key);
        return sealed || !target ? null : storage.getItem(target);
      },
      setItem(key: string, value: string) {
        const target = slot(key);
        if (!sealed && target) storage.setItem(target, value);
      },
      removeItem(key: string) {
        const target = slot(key);
        if (!sealed && target) storage.removeItem(target);
      },
    },
    seal() {
      if (sealed) return;
      sealed = true;
      let failed = false;
      for (const key of [
        SESSION_SLOT,
        `${SESSION_SLOT}-code-verifier`,
        `${SESSION_SLOT}-user`,
        SESSION_STARTED_KEY,
      ]) {
        try {
          storage.removeItem(key);
        } catch {
          failed = true;
        }
      }
      try {
        storage.removeItem("bm-owner-verified:v1");
        for (let index = storage.length - 1; index >= 0; index--) {
          const key = storage.key(index);
          if (key?.startsWith("bm-owner-snapshot:")) storage.removeItem(key);
        }
      } catch {
        failed = true;
      }
      if (failed) throw new Error("Session storage purge failed");
    },
    get sealed() {
      return sealed;
    },
  };
}
