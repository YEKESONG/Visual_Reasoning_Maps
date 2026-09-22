import { test, expect } from "@playwright/test";

const failure =
  "Le modèle n’a pas fourni de résultat exploitable à l’étape « {stage} ». Relancez l’analyse : les étapes déjà terminées sont gardées en cache.";

test("a reload resumes a running analysis and a failure names the stage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("vrm.locale", "zh");
    sessionStorage.setItem("vrm.task", "running-task");
  });
  await page.route("**/api/tasks/running-task", (route) =>
    route.fulfill({
      json: {
        step: "Détails section par section",
        progress: 38,
        status: "running",
      },
    }),
  );
  await page.route("**/api/tasks/running-task/events", (route) =>
    route.fulfill({
      headers: { "content-type": "text/event-stream" },
      body: [
        'data: {"step":"Relations entre les sections","progress":52,"status":"running"}',
        "",
        `data: ${JSON.stringify({
          step: failure,
          progress: 0,
          status: "error",
          error: failure,
          params: { stage: "relations entre les sections" },
        })}`,
        "",
        "",
      ].join("\n"),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("“连接各节关系”阶段");
  expect(
    await page.evaluate(() => sessionStorage.getItem("vrm.task")),
  ).toBeNull();
});

test("the library says when no API key is configured", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("vrm.locale", "en"));
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        status: "ok",
        configured: false,
        model: "deepseek/deepseek-flash",
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByText("No API key is set.")).toBeVisible();
});
