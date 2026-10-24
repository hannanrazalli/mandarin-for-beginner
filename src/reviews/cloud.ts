import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../auth/AuthProvider";
import { useLearningProgress } from "../learning/cloud";
import { malaysiaDay } from "./algorithms";
import type { ReviewCard } from "./local";

const scheduleSchema = z.object({
  word_id: z.string(),
  modality: z.enum(["meaning", "listening", "tone", "hanzi"]),
  ease_factor: z.coerce.number().min(1.3).max(5),
  repetitions: z.number().int(),
  interval_days: z.number().int(),
  due_at: z.string(),
  version: z.number().int(),
  last_reviewed_at: z.string().nullable(),
});
const wordSchema = z.object({
  id: z.string(),
  slug: z.string(),
  hanzi: z.string(),
  pinyin: z.string(),
  meaning_ms: z.string(),
});
export const reviewResultSchema = z.object({
  event_id: z.uuid(),
  word_id: z.string(),
  modality: z.string(),
  correct: z.boolean(),
  grade: z.number().int().min(0).max(5),
  xp_awarded: z.number().int().nonnegative(),
  total_xp: z.number().int().nonnegative(),
  schedule: z.object({
    ease_factor: z.coerce.number(),
    repetitions: z.number().int(),
    interval_days: z.number().int(),
    due_at: z.string(),
    version: z.number().int(),
  }),
});
export function useReviewData() {
  const auth = useAuth();
  const progress = useLearningProgress();
  const query = useQuery({
    queryKey: ["owner", progress.scope, "reviews"],
    enabled: auth.status === "owner" && !!auth.client,
    queryFn: async ({ signal }) => {
      if (!auth.client || !auth.owner) throw new Error("Owner required");
      const id = auth.owner.id;
      const results = await Promise.all([
        auth.client
          .from("review_schedule")
          .select("*")
          .eq("user_id", id)
          .abortSignal(signal),
        auth.client
          .from("words")
          .select("id,slug,hanzi,pinyin,meaning_ms")
          .abortSignal(signal),
        auth.client
          .from("streak_state")
          .select("*")
          .eq("user_id", id)
          .abortSignal(signal),
        auth.client
          .from("user_achievements")
          .select("achievement_id,earned_at")
          .eq("user_id", id)
          .abortSignal(signal),
        auth.client
          .from("achievements")
          .select("id,code,label_ms,label_en")
          .abortSignal(signal),
        auth.client
          .from("profiles")
          .select("daily_goal")
          .eq("id", id)
          .abortSignal(signal),
        auth.client
          .from("daily_activity")
          .select("local_date,seconds_studied")
          .eq("user_id", id)
          .eq("local_date", malaysiaDay(Date.now()))
          .abortSignal(signal),
      ]);
      if (results.some((result) => result.error))
        throw new Error("Review data unavailable");
      const schedules = z.array(scheduleSchema).parse(results[0].data);
      const words = z.array(wordSchema).parse(results[1].data);
      const due: ReviewCard[] = schedules
        .filter((row) => Date.parse(row.due_at) <= Date.now())
        .flatMap((row) => {
          const word = words.find((value) => value.id === row.word_id);
          return word
            ? [
                {
                  word_id: word.id,
                  slug: word.slug,
                  hanzi: word.hanzi,
                  pinyin: word.pinyin,
                  meaning_ms: word.meaning_ms,
                  modality: row.modality,
                  schedule: row,
                },
              ]
            : [];
        })
        .sort((a, b) => a.schedule.ease_factor - b.schedule.ease_factor);
      const streak =
        z
          .array(
            z.object({
              current_days: z.number(),
              longest_days: z.number(),
              last_active_date: z.string().nullable(),
              freeze_balance: z.number(),
              active_days: z.number(),
            }),
          )
          .parse(results[2].data)[0] ?? null;
      const earned = z
        .array(z.object({ achievement_id: z.string(), earned_at: z.string() }))
        .parse(results[3].data);
      const definitions = z
        .array(
          z.object({
            id: z.string(),
            code: z.string(),
            label_ms: z.string(),
            label_en: z.string(),
          }),
        )
        .parse(results[4].data);
      const goal =
        z
          .array(
            z.object({
              daily_goal: z.union([z.literal(3), z.literal(5), z.literal(10)]),
            }),
          )
          .parse(results[5].data)[0]?.daily_goal ?? 5;
      const seconds = z
        .array(z.object({ seconds_studied: z.number() }))
        .parse(results[6].data)
        .reduce((sum, row) => sum + row.seconds_studied, 0);
      return {
        due,
        streak,
        badges: definitions.filter((badge) =>
          earned.some((row) => row.achievement_id === badge.id),
        ),
        goal,
        seconds,
      };
    },
  });
  return { auth, progress, query };
}
