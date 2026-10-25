import { expect, it } from "vitest";
import { contentReviewCounts, contentReviewStatus } from "./content-status";
import { lessons } from "./curriculum";

it("covers all canonical items without inventing human verification", () => {
  const items = lessons.flatMap((lesson) => lesson.items);
  expect(Object.values(contentReviewCounts).reduce((a, b) => a + b, 0)).toBe(
    items.length,
  );
  expect(contentReviewCounts["human-verified"]).toBe(0);
  for (const item of items)
    expect(item.reviewStatus).toBe(contentReviewStatus(item.id));
  expect(contentReviewStatus("unknown-future-item")).toBe("unverified");
});
