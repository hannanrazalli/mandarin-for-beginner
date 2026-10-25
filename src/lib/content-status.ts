import statuses from "../../content/review-status.json";
import { z } from "./zod-config";

export const reviewStatusSchema = z.enum([
  "unverified",
  "machine-checked",
  "human-verified",
]);
const data = z
  .object({
    schema_version: z.literal(1),
    source: z.string(),
    items: z.record(z.string(), z.object({ reviewStatus: reviewStatusSchema })),
  })
  .parse(statuses);
export function contentReviewStatus(id: string) {
  return data.items[id]?.reviewStatus ?? "unverified";
}
export const contentReviewCounts = Object.values(data.items).reduce(
  (totals, item) => {
    totals[item.reviewStatus]++;
    return totals;
  },
  { unverified: 0, "machine-checked": 0, "human-verified": 0 },
);
