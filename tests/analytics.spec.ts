import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import lesson from "../content/lessons/u0-initials-1.json" with {
  type: "json",
};

test("exports the current local scope and presents accessible true activity", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const event = {
    id: "78000000-0000-4000-8000-000000000001",
    scope: "practice",
    lessonId: lesson.id,
    contentVersion: lesson.content_version,
    answers: lesson.items.map((item) => ({
      item_id: item.id,
      answer: item.pinyin,
    })),
    createdAt: new Date().toISOString(),
    durationSeconds: 60,
  };
  await page.addInitScript((value) => {
    localStorage.setItem("bm-learning-practice", JSON.stringify([value]));
    localStorage.setItem("bm-owner-decoy", "must-not-export-other-account");
  }, event);
  await page.goto("/statistik");
  await expect(
    page.getByRole("heading", { name: "Corak pembelajaran" }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await pending;
  const path = await download.path();
  if (!path) throw new Error("No export file");
  const text = await readFile(path, "utf8");
  const data = JSON.parse(text);
  expect(data.scope).toBe("practice");
  expect(data.tables.lesson_attempts).toHaveLength(1);
  expect(text).not.toContain("must-not-export-other-account");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
