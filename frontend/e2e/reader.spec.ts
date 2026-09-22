import { test, expect } from "@playwright/test";

test("PDF demonstration: hierarchy, evidence, full text and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /Descartes.*PDF/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/library.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Descartes.*PDF/ }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.locator('.react-flow__node[data-id="experience"]').click();
  await expect(page.locator(".detail-panel h2")).toHaveText(
    "Une méthode, des progrès",
  );
  await expect(page.locator(".pdf-highlight").first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((c) => (c as HTMLCanvasElement).width),
    )
    .toBeGreaterThan(300);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "../docs/screenshots/map-pdf.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Développer Rendre son parcours visible" })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "../docs/screenshots/map-expanded.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Replier Rendre son parcours visible" })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByRole("button", { name: "Expliquer cette étape" }).click();
  await expect(page.locator(".explanation")).toContainText(
    "Démonstration éditoriale",
  );
  await page.getByRole("link", { name: "Voir dans le texte intégral" }).click();
  await expect(page.locator(".reader-sheet")).toHaveCount(2);
  await page.locator(".pdf-highlight.current").first().scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "../docs/screenshots/fulltext-pdf.png",
    fullPage: true,
  });
  await page.locator(".pdf-highlight.current").first().click();
  await expect(page).toHaveURL(/step=experience/);
  await page.locator('.react-flow__node[data-id="judge"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".detail-panel h2")).toHaveText(
    "Laisser le lecteur juger",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".detail-empty")).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "../docs/screenshots/map-1024.png",
    fullPage: true,
  });
  const panel = await page.locator(".graph-panel").boundingBox();
  for (const node of await page.locator(".react-flow__node").all()) {
    const box = await node.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(panel!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      panel!.x + panel!.width + 1,
    );
  }
  expect(errors).toEqual([]);
});

test("HTML source navigates both ways and filters relations", async ({
  page,
}) => {
  await page.goto("/doc/demo-descartes-html");
  await expect(page.locator(".react-flow__node")).toHaveCount(6);
  await page.getByLabel("Contradiction", { exact: true }).uncheck();
  await expect(page.locator('.react-flow__edge[data-id="rel7"]')).toHaveCount(
    0,
  );
  await page.getByLabel("Contradiction", { exact: true }).check();
  await page.locator('.react-flow__node[data-id="method"]').click();
  await expect(
    page.frameLocator(".detail-panel iframe").locator(".vrm-highlight").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/map-html.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Voir dans le texte intégral" }).click();
  await expect(
    page.frameLocator(".reader-pages iframe").locator(".vrm-current").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "../docs/screenshots/fulltext-html.png",
    fullPage: true,
  });
  await page
    .frameLocator(".reader-pages iframe")
    .locator(".vrm-current")
    .first()
    .click();
  await expect(page).toHaveURL(/step=method/);
});
