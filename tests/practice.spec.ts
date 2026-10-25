import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pack = JSON.parse(
  readFileSync(
    new URL("../content/practice-dialogues.json", import.meta.url),
    "utf8",
  ),
);
test("bilingual extra practice supports dialogue retries, recall and hidden dictation answers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/interaktif");
  await expect(
    page.getByRole("heading", { name: "Dengar. Balas. Cuba sendiri." }),
  ).toBeVisible();
  await page.goto("/tetapan");
  await page.getByLabel("English", { exact: true }).check();
  await page.goto("/interaktif");
  await expect(
    page.getByRole("heading", { name: "Listen. Respond. Try it yourself." }),
  ).toBeVisible();
  await expect(
    page.getByText("Local extra practice", { exact: false }),
  ).toBeVisible();
  const dialogue = pack.dialogues[0];
  await page
    .getByRole("button", { name: new RegExp(dialogue.title_en) })
    .click();
  await expect(
    page.getByText(dialogue.turns[0].meaning_en, { exact: true }),
  ).toBeVisible();
  for (let i = 1; i < dialogue.turns.length; i++)
    await page.getByRole("button", { name: "Next line", exact: true }).click();
  await page
    .getByRole("button", { name: "Try responding", exact: true })
    .click();
  for (const question of dialogue.questions) {
    const wrong = question.options.find(
      (o: { id: string }) => o.id !== question.correct_option_id,
    );
    await page.getByRole("button", { name: new RegExp(wrong.hanzi) }).click();
    await expect(
      page.getByText("Look at the context again.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator(".answer-options button").first()).toBeFocused();
    const correct = question.options.find(
      (o: { id: string }) => o.id === question.correct_option_id,
    );
    await page.getByRole("button", { name: new RegExp(correct.hanzi) }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(
    page.getByRole("button", { name: "Record", exact: true }),
  ).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Check sample response", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to practice garden", exact: true })
    .click();
  await expect(page.locator("#practice-dialogue-0")).toBeFocused();
  const contrast = pack.listening_contrasts[0];
  await page
    .getByRole("button", { name: new RegExp(contrast.title_en) })
    .click();
  await page
    .getByRole("button", { name: "Pinyin dictation", exact: true })
    .click();
  const target = contrast.options.find(
    (o: { id: string }) => o.id === contrast.target_option_id,
  );
  await expect(page.getByText(target.meaning_en, { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Type pinyin with tone marks or tone numbers")
    .fill(target.pinyin);
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!", { exact: true })).toBeVisible();
  await expect(
    page.getByText(target.meaning_en, { exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
