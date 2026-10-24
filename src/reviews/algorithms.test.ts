import { describe, expect, it } from "vitest";
import {
  malaysiaDay,
  normalizePinyin,
  normalizeReviewAnswer,
  sm2,
  streakFromDates,
} from "./algorithms";

const base = {
  ease_factor: 2.5,
  repetitions: 0,
  interval_days: 0,
  due_at: new Date(0).toISOString(),
  version: 1,
};
describe("server-aligned SM2", () => {
  it("uses first/second intervals then old ease, and resets lapses", () => {
    const first = sm2(base, true, 0, 0);
    const second = sm2(first, true, 1, 0);
    const third = sm2(second, true, 0, 0);
    expect(first.interval_days).toBe(1);
    expect(second.interval_days).toBe(6);
    expect(third.interval_days).toBe(Math.round(6 * second.ease_factor));
    const lapse = sm2(third, false, 0, 0);
    expect(lapse.repetitions).toBe(0);
    expect(lapse.interval_days).toBe(1);
    expect(lapse.version).toBe(5);
  });
  it("clamps ease and gives hints a lower grade", () => {
    expect(sm2({ ...base, ease_factor: 1.3 }, false, 0).ease_factor).toBe(1.3);
    expect(sm2({ ...base, ease_factor: 5 }, true, 0).ease_factor).toBe(5);
    expect(sm2(base, true, 2).ease_factor).toBeLessThan(
      sm2(base, true, 0).ease_factor,
    );
  });
});
describe("Malaysia day and transparent freezes", () => {
  it("uses UTC+8 boundaries and one-day freeze", () => {
    expect(malaysiaDay("2026-10-23T16:01:00Z")).toBe("2026-10-24");
    const streak = streakFromDates(["2026-10-20T12:00Z", "2026-10-22T12:00Z"]);
    expect(streak.current_days).toBe(3);
    expect(streak.active_days).toBe(2);
    expect(streak.freeze_balance).toBe(0);
  });
  it("normalizes pinyin casing/Unicode while retaining tone distinction", () => {
    expect(normalizePinyin(" NǏ HǍO ")).toBe("nǐ hǎo");
    expect(normalizePinyin("ni hao")).not.toBe(normalizePinyin("nǐ hǎo"));
  });
});

describe("server review normalization parity", () => {
  it("trims and lowercases both answers without fuzzy matching", () => {
    expect(normalizeReviewAnswer(" AWAK ")).toBe(normalizeReviewAnswer("awak"));
    expect(normalizeReviewAnswer(" NǏ HǍO ")).toBe(
      normalizeReviewAnswer("nǐ hǎo"),
    );
    expect(normalizeReviewAnswer("nǐ  hǎo")).not.toBe(
      normalizeReviewAnswer("nǐ hǎo"),
    );
    expect(normalizeReviewAnswer("ni hao")).not.toBe(
      normalizeReviewAnswer("nǐ hǎo"),
    );
  });
});

describe("local test-out server parity", () => {
  it("scores case and trim consistently in displayed results and saved unlocks", async () => {
    const { testOutAccuracy } = await import("../learning/testout");
    const { lessons, canonicalAnswer } = await import("../lib/curriculum");
    const answers = lessons
      .filter((lesson) => lesson.unit === 1)
      .flatMap((lesson) =>
        lesson.items.map((item) => ({
          lesson_slug: lesson.id,
          item_id: item.id,
          answer: ` ${canonicalAnswer(item).toUpperCase()} `,
        })),
      );
    const event = {
      id: crypto.randomUUID(),
      scope: "practice" as const,
      createdAt: new Date().toISOString(),
      answers,
    };
    expect(testOutAccuracy(event)).toBe(1);
    expect(
      testOutAccuracy({
        ...event,
        answers: answers.map((answer, index) =>
          index === 0 ? { ...answer, answer: "different meaning" } : answer,
        ),
      }),
    ).toBe(0.95);
  });
});
