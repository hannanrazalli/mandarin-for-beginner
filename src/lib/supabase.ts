import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createTabAuthStorage } from "../auth/tab-storage";

type Database = {
  public: {
    Tables: {
      lessons: {
        Row: { id: string; slug: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_progress: {
        Row: {
          user_id: string;
          lesson_id: string;
          status: string;
          best_accuracy: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      study_sessions: {
        Row: {
          user_id: string;
          xp_awarded: number;
          ended_at: string;
          lesson_id: string | null;
          correct_count: number;
          answer_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: { id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_lesson: {
        Args: {
          p_event_id: string;
          p_lesson_slug: string;
          p_content_version: number;
          p_answers: { item_id: string; answer: string }[];
          p_duration_seconds: number;
        };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
const publicConfigSchema = z.object({
  url: z.string().regex(/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/),
  key: z.string().regex(/^sb_publishable_[A-Za-z0-9_-]{20,512}$/),
});
export function parsePublicConfig(url: unknown, key: unknown) {
  const result = publicConfigSchema.safeParse({ url, key });
  return result.success ? result.data : null;
}
export type PublicAuthClient = ReturnType<typeof createClient<Database>>;
type Runtime = {
  config: { url: string; key: string };
  storage: Storage;
  tab: ReturnType<typeof createTabAuthStorage>;
};
const runtimes = new WeakMap<PublicAuthClient, Runtime>();
export function createPublicClient(
  url: unknown,
  key: unknown,
  storage: Storage | null,
) {
  const config = parsePublicConfig(url, key);
  if (!config || !storage) return null;
  try {
    storage.setItem("bm-auth-storage-check", "1");
    storage.removeItem("bm-auth-storage-check");
    const tab = createTabAuthStorage(storage);
    const client = createClient<Database>(config.url, config.key, {
      auth: {
        storage: tab.adapter,
        storageKey: tab.channelKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
    runtimes.set(client, { config, storage, tab });
    return client;
  } catch {
    return null;
  }
}
let tabStorage: Storage | null = null;
try {
  tabStorage = window.sessionStorage;
} catch {
  /* A blocked per-tab store disables login. */
}
export const supabase = createPublicClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  tabStorage,
);

export function sealPublicClient(client: PublicAuthClient) {
  const runtime = runtimes.get(client);
  // Seal before any asynchronous work; the old SDK can never write to a new session.
  if (runtime) runtime.tab.seal();
  else {
    for (const key of [
      "bm-auth-session",
      "bm-auth-session-code-verifier",
      "bm-auth-session-user",
      "bm-auth-started-at",
    ])
      sessionStorage.removeItem(key);
  }
  void client.auth.stopAutoRefresh?.().catch(() => {});
}
export function renewPublicClient(client: PublicAuthClient) {
  const runtime = runtimes.get(client);
  return runtime
    ? createPublicClient(
        runtime.config.url,
        runtime.config.key,
        runtime.storage,
      )
    : client;
}
export async function revokePublicSession(
  client: PublicAuthClient,
  accessToken: string | null,
  global: boolean,
) {
  if (!accessToken) return false;
  const runtime = runtimes.get(client);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = runtime
      ? fetch(
          `${runtime.config.url.replace(/\/$/, "")}/auth/v1/logout?scope=${global ? "global" : "local"}`,
          {
            method: "POST",
            headers: {
              apikey: runtime.config.key,
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
            cache: "no-store",
            credentials: "omit",
          },
        ).then(
          (response) =>
            response.ok || response.status === 401 || response.status === 403,
        )
      : client.auth.admin
          .signOut(accessToken, global ? "global" : "local")
          .then((result) => !result.error);
    return await Promise.race([
      request,
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(false);
        }, 4000);
      }),
    ]);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
