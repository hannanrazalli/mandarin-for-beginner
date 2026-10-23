import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("completes a real local foundation lesson and unlocks the next", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("link", { name: "Mula pelajaran", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Awalan 1: b, p, m", exact: true }),
  ).toBeVisible();
  for (const answer of ["bā", "pà", "mā"]) {
    await page
      .getByRole("button", { name: "Lihat penerangan", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cuba soalan", exact: true })
      .click();
    await page
      .getByRole("button", { name: new RegExp(`^[1-4] ${answer}$`) })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Ya, tepat." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Seterusnya", exact: true }).click();
  }
  await expect(page.getByText("100", { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText(
      "Latihan disimpan pada peranti ini. Ini bukan kemajuan akaun.",
    ),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("link", { name: "Laluan belajar", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("link", { name: /Mula pelajaran: Awalan 2/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: /Mula pelajaran: Awalan 2/ }),
  ).toBeVisible();
});
