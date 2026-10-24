import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import { useLearningProgress } from "../learning/cloud";
import { scoreLesson, usePractice } from "../learning/store";
import { testOutAccuracy, useLocalTestOut } from "../learning/testout";
import { getLesson } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import { z } from "../lib/zod-config";
import { useLocalReviews } from "../reviews/local";
import {
  type Insights,
  insightSchema,
  type StudyRecord,
  sessionSchema,
} from "./model";

const recordsSchema = z.array(z.record(z.string(), z.unknown()));
export async function fetchPersonal(
  client: PublicAuthClient,
  owner: string,
  signal: AbortSignal,
) {
  const personalTables = [
    {
      table: "profiles",
      query: () =>
        client
          .from("profiles")
          .select("*", { count: "exact" })
          .eq("id", owner)
          .order("id"),
    },
    {
      table: "user_progress",
      query: () =>
        client
          .from("user_progress")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("lesson_id"),
    },
    {
      table: "review_schedule",
      query: () =>
        client
          .from("review_schedule")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("word_id")
          .order("modality"),
    },
    {
      table: "study_sessions",
      query: () =>
        client
          .from("study_sessions")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("id"),
    },
    {
      table: "user_achievements",
      query: () =>
        client
          .from("user_achievements")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("achievement_id"),
    },
    {
      table: "daily_activity",
      query: () =>
        client
          .from("daily_activity")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("local_date"),
    },
    {
      table: "streak_state",
      query: () =>
        client
          .from("streak_state")
          .select("*", { count: "exact" })
          .eq("user_id", owner)
          .order("user_id"),
    },
  ];
  const tables: Record<string, Record<string, unknown>[]> = {};
  await Promise.all(
    personalTables.map(async (config) => {
      const records: Record<string, unknown>[] = [];
      for (;;) {
        if (signal.aborted) throw new Error("Export cancelled");
        const response = await config
          .query()
          .range(records.length, records.length + 499)
          .abortSignal(signal);
        if (response.error || response.count === null)
          throw new Error("Personal data unavailable");
        if (response.count > 50000)
          throw new Error("Export exceeds supported size");
        const page = recordsSchema.parse(response.data);
        records.push(...page);
        if (records.length >= response.count) break;
        if (!page.length) throw new Error("Incomplete personal data");
      }
      tables[config.table] = records;
    }),
  );
  return tables;
}

export function useAnalytics() {
  const auth = useAuth();
  const progress = useLearningProgress();
  const practice = usePractice((state) => state.events);
  const reviews = useLocalReviews((state) => state.events);
  const exams = useLocalTestOut((state) => state.events);
  const query = useQuery({
    queryKey: ["owner", progress.scope, "analytics"],
    enabled: auth.status === "owner" && !!auth.client && !!auth.owner,
    queryFn: async ({ signal }) => {
      if (!auth.client || !auth.owner) throw new Error("Owner required");
      const [tables, insights, words] = await Promise.all([
        fetchPersonal(auth.client, auth.owner.id, signal),
        auth.client.rpc("learning_insights").abortSignal(signal),
        auth.client.from("words").select("id,slug").abortSignal(signal),
      ]);
      if (insights.error || words.error)
        throw new Error("Analytics unavailable");
      return {
        tables,
        insights: insightSchema.parse(insights.data),
        words: z
          .array(z.object({ id: z.string(), slug: z.string() }))
          .parse(words.data),
        sessions: z.array(sessionSchema).parse(tables.study_sessions),
      };
    },
  });
  const localSessions: StudyRecord[] = [];
  const localInsights: Insights = { items: [], reviews: [] };
  for (const event of practice) {
    const lesson = getLesson(event.lessonId);
    if (!lesson || lesson.content_version !== event.contentVersion) continue;
    const score = scoreLesson(lesson, event.answers);
    localSessions.push({
      ended_at: event.createdAt,
      duration_seconds: event.durationSeconds,
      xp_awarded: 0,
      correct_count: score.correct,
      answer_count: score.total,
      lesson_id: event.lessonId,
    });
    for (const item of lesson.items) {
      const answer = event.answers.find((a) => a.item_id === item.id)?.answer;
      const expected =
        item.kind === "vocabulary" ? item.meaning_ms : item.pinyin;
      localInsights.items.push({
        lesson_slug: lesson.id,
        content_version: lesson.content_version,
        item_id: item.id,
        correct: Number(answer === expected),
        total: 1,
      });
    }
  }
  for (const event of reviews) {
    localSessions.push({
      ended_at: event.createdAt,
      duration_seconds: 0,
      xp_awarded: 0,
      correct_count: Number(event.correct),
      answer_count: 1,
      lesson_id: null,
    });
    localInsights.reviews.push({
      word_id: event.word_id,
      modality: event.modality,
      correct: Number(event.correct),
      total: 1,
    });
  }
  for (const event of exams)
    localSessions.push({
      ended_at: event.createdAt,
      duration_seconds: 0,
      xp_awarded: 0,
      correct_count: Math.round(testOutAccuracy(event) * 20),
      answer_count: 20,
      lesson_id: null,
    });
  return {
    auth,
    progress,
    query,
    local: {
      sessions: localSessions,
      insights: localInsights,
      words: [],
      tables: {
        lesson_attempts: practice,
        review_attempts: reviews,
        testout_attempts: exams,
      } as Record<string, unknown[]>,
    },
  };
}
