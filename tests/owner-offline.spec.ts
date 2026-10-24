import { expect, test } from "@playwright/test";

test("mock owner verification, lost committed response and offline reload replay the immutable event once", async ({
  page,
  context,
}) => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const lessonId = "22222222-2222-4222-8222-222222222222";
  const bodies: unknown[] = [];
  const receipts = new Map<string, Record<string, unknown>>();
  let awards = 0;
  let verifications = 0;
  let loseResponse = true;
  let disconnected = false;
  await page.route("https://*.supabase.co/**", async (route) => {
    if (disconnected) {
      await route.abort("internetdisconnected");
      return;
    }
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/user") {
      verifications++;
      await route.fulfill({
        json: {
          id: owner,
          email: "owner@example.test",
          email_confirmed_at: "2026-01-01T00:00:00Z",
          aud: "authenticated",
          role: "authenticated",
        },
      });
      return;
    }
    if (url.pathname === "/auth/v1/token") {
      await route.abort("failed");
      return;
    }
    if (url.pathname === "/rest/v1/profiles") {
      await route.fulfill({
        json:
          url.searchParams.get("select") === "id"
            ? { id: owner }
            : [{ daily_goal: 5 }],
      });
      return;
    }
    if (url.pathname === "/rest/v1/lessons") {
      await route.fulfill({ json: [{ id: lessonId, slug: "u0-initials-1" }] });
      return;
    }
    if (url.pathname === "/rest/v1/user_progress") {
      await route.fulfill({
        json: receipts.size
          ? [{ lesson_id: lessonId, status: "completed", best_accuracy: 1 }]
          : [],
      });
      return;
    }
    if (url.pathname === "/rest/v1/study_sessions") {
      await route.fulfill({
        json: receipts.size
          ? [
              {
                xp_awarded: 10,
                ended_at: new Date().toISOString(),
                lesson_id: lessonId,
                correct_count: 3,
                answer_count: 3,
                duration_seconds: 60,
              },
            ]
          : [],
      });
      return;
    }
    if (url.pathname === "/rest/v1/rpc/complete_lesson") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      bodies.push(payload);
      const id = String(payload.p_event_id);
      let receipt = receipts.get(id);
      if (!receipt) {
        awards++;
        receipt = {
          event_id: id,
          lesson_slug: payload.p_lesson_slug,
          correct_count: 3,
          answer_count: 3,
          accuracy: 1,
          xp_awarded: 10,
          total_xp: 10,
          completed: true,
          completed_lesson_slugs: ["u0-initials-1"],
        };
        receipts.set(id, receipt);
      }
      if (loseResponse) {
        loseResponse = false;
        await route.abort("failed");
        return;
      }
      await route.fulfill({ json: receipt });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.addInitScript(
    ({ id }) => {
      if (!sessionStorage.getItem("mock-owner-initialized")) {
        sessionStorage.setItem("mock-owner-initialized", "1");
        sessionStorage.setItem("bm-auth-started-at", String(Date.now()));
        sessionStorage.setItem(
          "bm-auth-session",
          JSON.stringify({
            access_token: "mock-token-not-a-credential",
            refresh_token: "mock-refresh-not-a-credential",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
              id,
              email: "owner@example.test",
              email_confirmed_at: "2026-01-01T00:00:00Z",
              aud: "authenticated",
              role: "authenticated",
            },
          }),
        );
      }
    },
    { id: owner },
  );
  await page.goto("/belajar/u0-initials-1");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => verifications).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() => sessionStorage.getItem("bm-owner-verified:v1")),
    )
    .not.toBeNull();
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
    await page.getByRole("button", { name: "Seterusnya", exact: true }).click();
  }
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  disconnected = true;
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Awalan 1: b, p, m", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Latihan akaun luar talian", { exact: true }),
  ).toBeVisible();
  await page.goto("/belajar/u0-initials-2");
  await expect(
    page.getByRole("button", { name: "Lihat penerangan", exact: true }),
  ).toBeVisible();
  const queued = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("bm-owner-event:"))
      .map((key) => JSON.parse(localStorage.getItem(key) || "null")),
  );
  expect(queued).toHaveLength(1);
  expect(queued[0].args).toEqual(bodies[0]);
  const before = verifications;
  disconnected = false;
  await context.setOffline(false);
  await page.reload();
  await expect.poll(() => bodies.length, { timeout: 20000 }).toBeGreaterThan(1);
  expect(verifications).toBeGreaterThan(before);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(awards).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(localStorage).filter((key) =>
            key.startsWith("bm-owner-event:"),
          ).length,
      ),
    )
    .toBe(0);
  disconnected = true;
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Lihat penerangan", exact: true }),
  ).toBeVisible();
  expect(awards).toBe(1);
});
