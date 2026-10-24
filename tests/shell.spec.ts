import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("desktop preview, route focus and accessible shell", async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (event) => {
      document.documentElement.dataset.cspViolation = event.effectiveDirective;
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Sedikit demi sedikit, kita belajar." }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.getByRole("link", { name: "Mula pelajaran", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Awalan 1: b, p, m" }),
  ).toBeFocused();
  await expect(
    page
      .getByText("Latihan setempat · peranti ini sahaja", { exact: false })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Seterusnya", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-csp-violation",
    /.+/,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("mobile language and appearance persist without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/tetapan");
  const brandTarget = await page.locator(".mobile-brand").boundingBox();
  expect(brandTarget?.height).toBeGreaterThanOrEqual(44);
  await page.getByLabel("English", { exact: true }).check();
  await page.getByLabel("Dark", { exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Make this space your own." }),
  ).toBeVisible();
  await expect(page.getByLabel("Dark", { exact: true })).toBeChecked();
  await expect(page.locator(".bottomnav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .locator(".bottomnav")
    .getByRole("link", { name: "Review", exact: true })
    .click();
  await expect(page.getByText("Nothing to review yet.")).toBeVisible();
});
test("tablet path and statistics remain honest", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/belajar");
  await expect(
    page.getByRole("heading", { name: "Asas bunyi Mandarin", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Statistik", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada data pembelajaran" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
