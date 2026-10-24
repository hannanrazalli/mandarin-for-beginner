import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("pinyin practice accepts marked tones and local daily goal persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/latihan");
  await page.getByLabel("Taip pinyin bertanda nada").fill("bā");
  await page.getByRole("button", { name: "Semak", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tepat." }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/tetapan");
  await page.getByLabel("10 minit", { exact: true }).check();
  await page.reload();
  await expect(page.getByLabel("10 minit", { exact: true })).toBeChecked();
});
