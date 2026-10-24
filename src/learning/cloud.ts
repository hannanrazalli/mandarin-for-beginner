import { QueryClient, useQuery } from "@tanstack/react-query";
import { useRef, useSyncExternalStore } from "react";
import { useAuth } from "../auth/AuthProvider";
import { registerAccountPurger } from "../auth/purge";
import { getLesson } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import { z } from "../lib/zod-config";
import { queueMutation } from "../offline/dispatch";
import {
  lease,
  offlineTick,
  provisionalCompleted,
  readSnapshot,
  subscribeOffline,
  writeSnapshot,
} from "../offline/store";
import {
  type LearningEvent,
  practiceCompleted,
  useLessonPlayer,
  usePractice,
} from "./store";
import { testOutCompleted, useLocalTestOut } from "./testout";
export const learningQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
registerAccountPurger(() => {
  void learningQueryClient.cancelQueries();
  learningQueryClient.clear();
  useLessonPlayer.getState().clear();
});
const progressSchema = z.array(
  z.object({
    lesson_id: z.string(),
    status: z.string(),
    best_accuracy: z.coerce.number().min(0).max(1),
  }),
);
const sessionsSchema = z.array(
  z.object({
    xp_awarded: z.number().int().nonnegative(),
    ended_at: z.string(),
    lesson_id: z.string().nullable(),
    correct_count: z.number().int(),
    answer_count: z.number().int(),
  }),
);
const lessonIdsSchema = z.array(z.object({ id: z.string(), slug: z.string() }));
export const completionSchema = z.object({
  event_id: z.uuid(),
  lesson_slug: z.string(),
  correct_count: z.number().int().nonnegative(),
  answer_count: z.number().int().positive(),
  accuracy: z.number().min(0).max(1),
  xp_awarded: z.number().int().nonnegative(),
  completed: z.boolean(),
  total_xp: z.number().int().nonnegative(),
  completed_lesson_slugs: z.array(z.string()),
});
export function useLearningProgress() {
  const auth = useAuth();
  useSyncExternalStore(subscribeOffline, offlineTick);
  const offline = auth.status === "ownerOffline";
  const events = usePractice((state) => state.events);
  const tests = useLocalTestOut((state) => state.events);
  const lastOwner = useRef<string | null>(null);
  if ((auth.status === "owner" || offline) && auth.owner)
    lastOwner.current = auth.owner.id;
  else if (auth.status !== "initializing") lastOwner.current = null;
  const verifying = auth.status === "initializing";
  const owner = auth.status === "owner" || offline ? auth.owner : null;
  const scope =
    owner?.id ?? (verifying ? (lastOwner.current ?? "verifying") : "practice");
  const scopeOwner =
    scope !== "practice" && scope !== "verifying" ? scope : null;
  const query = useQuery({
    queryKey: ["owner", scopeOwner, "learning"],
    enabled: !offline && !!owner && !!auth.client,
    queryFn: async ({ signal }) => {
      if (!auth.client || !owner) throw new Error("Owner required");
      const token = lease();
      const results = await Promise.all([
        auth.client
          .from("user_progress")
          .select("lesson_id,status,best_accuracy")
          .eq("user_id", owner.id)
          .abortSignal(signal),
        auth.client
          .from("study_sessions")
          .select("xp_awarded,ended_at,lesson_id,correct_count,answer_count")
          .eq("user_id", owner.id)
          .abortSignal(signal),
        auth.client.from("lessons").select("id,slug").abortSignal(signal),
      ]);
      if (results.some((result) => result.error))
        throw new Error("Cloud progress unavailable");
      const progress = progressSchema.parse(results[0].data);
      const sessions = sessionsSchema.parse(results[1].data);
      const ids = lessonIdsSchema.parse(results[2].data);
      const completed = progress
        .filter((row) => row.status === "completed")
        .map((row) => ids.find((lesson) => lesson.id === row.lesson_id)?.slug)
        .filter((slug): slug is string => !!slug);
      if (token && !token.valid()) throw new Error("Expired owner lease");
      if (token)
        writeSnapshot(
          {
            completed: completed.flatMap((slug) => {
              const lesson = getLesson(slug);
              return lesson
                ? [{ lessonSlug: slug, contentVersion: lesson.content_version }]
                : [];
            }),
          },
          token,
        );
      return {
        completed: progress
          .filter((row) => row.status === "completed")
          .map((row) => ids.find((lesson) => lesson.id === row.lesson_id)?.slug)
          .filter((slug): slug is string => !!slug),
        sessions,
        totalXp: sessions.reduce((sum, row) => sum + row.xp_awarded, 0),
      };
    },
  });
  return {
    scope,
    verifying,
    offline,
    owner: !!scopeOwner,
    completed: scopeOwner
      ? [
          ...new Set([
            ...(offline
              ? (readSnapshot()?.completed.map((row) => row.lessonSlug) ?? [])
              : (query.data?.completed ?? [])),
            ...provisionalCompleted(),
          ]),
        ]
      : [
          ...new Set([
            ...practiceCompleted(events),
            ...testOutCompleted(tests),
          ]),
        ],
    query,
  };
}
export async function submitLesson(
  client: PublicAuthClient | null,
  ownerId: string,
  event: LearningEvent,
  force = false,
) {
  if (event.scope !== ownerId || event.scope === "practice")
    throw new Error("Completion scope mismatch");
  const response = await queueMutation(
    "completion",
    {
      p_event_id: event.id,
      p_lesson_slug: event.lessonId,
      p_content_version: event.contentVersion,
      p_answers: event.answers,
      p_duration_seconds: event.durationSeconds,
    },
    client,
    force,
  );
  const result = completionSchema.parse(response);
  if (
    result.event_id !== event.id ||
    result.lesson_slug !== event.lessonId ||
    result.answer_count !== event.answers.length
  )
    throw new Error("Completion mismatch");
  await learningQueryClient.invalidateQueries({
    queryKey: ["owner", ownerId, "learning"],
  });
  return result;
}
