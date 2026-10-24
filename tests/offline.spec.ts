import { expect, test } from "@playwright/test";

test("cached public lesson remains readable after cold offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sedikit demi sedikit, kita belajar." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.goto("/belajar/u0-initials-1");
  await expect(
    page.getByRole("heading", { name: "Awalan 1: b, p, m", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Penerangan" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Seterusnya", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("bm-owner-verified:v1")),
  ).toBeNull();
  await context.setOffline(false);
});
