import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("English flashcards show a meaning immediately and Next opens the required question", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/tetapan");
  await page.getByLabel("English", { exact: true }).check();
  await page
    .locator(".bottomnav")
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await page.getByRole("link", { name: "Start lesson", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Awalan 1: b, p, m", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Sample meaning (sound focus):", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Next: a short question about this card.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show explanation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Choose the matching pinyin.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".answer-options button")).toHaveCount(4);
  await expect(
    page.getByText("You have taken a step.", { exact: true }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
