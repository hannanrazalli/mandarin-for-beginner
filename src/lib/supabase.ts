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
          duration_seconds: number;
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
      review_schedule: {
        Row: {
          user_id: string;
          word_id: string;
          modality: string;
          ease_factor: number;
          repetitions: number;
          interval_days: number;
          due_at: string;
          last_reviewed_at: string | null;
          version: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      words: {
        Row: {
          id: string;
          slug: string;
          hanzi: string;
          pinyin: string;
          meaning_ms: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      streak_state: {
        Row: {
          user_id: string;
          current_days: number;
          longest_days: number;
          last_active_date: string | null;
          freeze_balance: number;
          active_days: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_achievements: {
        Row: { user_id: string; achievement_id: string; earned_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      achievements: {
        Row: { id: string; code: string; label_ms: string; label_en: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      daily_activity: {
        Row: {
          user_id: string;
          local_date: string;
          seconds_studied: number;
          xp: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          daily_goal: number;
          locale: string;
          sound_enabled: boolean;
          reduced_motion: boolean;
        };
        Insert: never;
        Update: {
          daily_goal?: number;
          locale?: string;
          sound_enabled?: boolean;
          reduced_motion?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      learning_insights: { Args: Record<string, never>; Returns: unknown };
      review_word: {
        Args: {
          p_event_id: string;
          p_word_id: string;
          p_modality: string;
          p_answer: string;
          p_expected_version: number;
          p_hints_used: number;
          p_duration_seconds: number;
        };
        Returns: unknown;
      };
      test_out_unit: {
        Args: {
          p_event_id: string;
          p_unit_slug: string;
          p_content_version: number;
          p_answers: { lesson_slug: string; item_id: string; answer: string }[];
          p_duration_seconds: number;
        };
        Returns: unknown;
      };

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
