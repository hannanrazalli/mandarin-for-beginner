import { useSyncExternalStore } from "react";
export type Language = "ms" | "en";
export type Theme = "system" | "light" | "dark";
export type Settings = {
  language: Language;
  theme: Theme;
  effects: boolean;
  stored: boolean;
};
const defaults: Settings = {
  language: "ms",
  theme: "system",
  effects: false,
  stored: true,
};
export function readSettings(storage: Pick<Storage, "getItem">): Settings {
  try {
    const value: unknown = JSON.parse(storage.getItem("bm-settings") || "null");
    if (!value || typeof value !== "object") return defaults;
    const data = value as Record<string, unknown>;
    return {
      language: data.language === "en" ? "en" : "ms",
      theme:
        data.theme === "light" || data.theme === "dark" ? data.theme : "system",
      effects: data.effects === true,
      stored: true,
    };
  } catch {
    return { ...defaults, stored: false };
  }
}
export function persistSettings(
  value: Settings,
  storage: Pick<Storage, "setItem">,
): Settings {
  try {
    storage.setItem("bm-settings", JSON.stringify(value));
    return { ...value, stored: true };
  } catch {
    return { ...value, stored: false };
  }
}
let current = (() => {
  try {
    return readSettings(localStorage);
  } catch {
    return { ...defaults, stored: false };
  }
})();
const listeners = new Set<() => void>();
export function updateSettings(patch: Partial<Omit<Settings, "stored">>) {
  try {
    current = persistSettings({ ...current, ...patch }, localStorage);
  } catch {
    current = { ...current, ...patch, stored: false };
  }
  for (const listener of listeners) listener();
}
export function useSettings() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}
