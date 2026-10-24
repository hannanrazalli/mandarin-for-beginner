import { z } from "zod";
import { create } from "zustand";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import { normalizeReviewAnswer } from "../reviews/algorithms";

const schema = z.object({
  id: z.uuid(),
  scope: z.literal("practice"),
  createdAt: z.iso.datetime(),
  answers: z
    .array(
      z.object({
        lesson_slug: z.string(),
        item_id: z.string(),
        answer: z.string().max(2000),
      }),
    )
    .length(20),
});
export type LocalTestOut = z.infer<typeof schema>;
const unit = lessons.filter((lesson) => lesson.unit === 1);
const canonical = unit.flatMap((lesson) =>
  lesson.items.map((item) => ({
    lesson_slug: lesson.id,
    item_id: item.id,
    answer: canonicalAnswer(item),
  })),
);
export function testOutAccuracy(event: LocalTestOut) {
  const keys = event.answers.map(
    (answer) => `${answer.lesson_slug}:${answer.item_id}`,
  );
  if (
    new Set(keys).size !== canonical.length ||
    !canonical.every((item) =>
      keys.includes(`${item.lesson_slug}:${item.item_id}`),
    )
  )
    return 0;
  return (
    canonical.filter((item) =>
      event.answers.some(
        (answer) =>
          answer.lesson_slug === item.lesson_slug &&
          answer.item_id === item.item_id &&
          normalizeReviewAnswer(answer.answer) ===
            normalizeReviewAnswer(item.answer),
      ),
    ).length / canonical.length
  );
}
function read() {
  try {
    return z
      .array(schema)
      .max(100)
      .parse(JSON.parse(localStorage.getItem("bm-testout-practice") || "[]"));
  } catch {
    return [];
  }
}
export const useLocalTestOut = create<{
  events: LocalTestOut[];
  stored: boolean;
  add: (event: LocalTestOut) => void;
}>((set, get) => ({
  events: read(),
  stored: true,
  add(event) {
    const events = [
      ...get().events.filter((old) => old.id !== event.id),
      schema.parse(event),
    ].slice(-100);
    let stored = true;
    try {
      localStorage.setItem("bm-testout-practice", JSON.stringify(events));
    } catch {
      stored = false;
    }
    set({ events, stored });
  },
}));
export function testOutCompleted(events: LocalTestOut[]) {
  return events.some((event) => testOutAccuracy(event) >= 0.9)
    ? unit.map((lesson) => lesson.id)
    : [];
}
