import { test, expect } from "@playwright/test";
const labels = {
  zh: {
    library: "文档库",
    focus: "只显示所选步骤的推理链",
    expand: "展开“呈现思考历程”的 2 个子步骤",
    collapse: "收起“呈现思考历程”的子步骤",
    evidence: "方法带来进步",
    explain: "解释这一步",
    note: "人工整理的示例",
    filter: "矛盾",
    next: "下一步",
    zoom: "放大",
    title: "笛卡尔 · 引导理性 · PDF",
    language: "界面语言",
  },
  en: {
    library: "Library",
    focus: "Isolate the selected step’s chain",
    expand: "Show the 2 sub-steps of “Make the thinking visible”",
    collapse: "Hide the sub-steps of “Make the thinking visible”",
    evidence: "A method, some progress",
    explain: "Explain this step",
    note: "Hand-made example",
    filter: "Contradiction",
    next: "Next step",
    zoom: "Zoom in",
    title: "Descartes · Guiding reason · PDF",
    language: "Interface language",
  },
  fr: {
    library: "Bibliothèque",
    focus: "Isoler la chaîne de l’étape choisie",
    expand: "Afficher les 2 sous-étapes de « Rendre son parcours visible »",
    collapse: "Masquer les sous-étapes de « Rendre son parcours visible »",
    evidence: "Une méthode, des progrès",
    explain: "Expliquer cette étape",
    note: "Exemple préparé à la main",
    filter: "Contradiction",
    next: "Étape suivante",
    zoom: "Zoom avant",
    title: "Descartes · Conduire sa raison · PDF",
    language: "Langue de l’interface",
  },
};
for (const locale of ["zh", "en", "fr"] as const) {
  test(`${locale}: library, graph controls, explanation, PDF and persistence`, async ({
    page,
  }) => {
    const l = labels[locale];
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.locator(".language-switch select").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale === "zh" ? "zh-CN" : locale,
    );
    await expect(page.getByRole("heading", { name: l.library })).toBeVisible();
    await page.reload();
    await expect(page.locator(".language-switch select")).toHaveValue(locale);
    await page
      .getByRole("link", { name: new RegExp(l.title.replaceAll("·", ".*")) })
      .click();
    await expect(page.locator(".react-flow__node")).toHaveCount(6);
    await expect(
      page.getByRole("button", { name: l.zoom, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: l.expand, exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(8);
    await page.getByRole("button", { name: l.collapse, exact: true }).click();
    await page.getByLabel(l.filter, { exact: true }).uncheck();
    await expect(page.locator('.react-flow__edge[data-id="rel7"]')).toHaveCount(
      0,
    );
    await page.locator('.react-flow__node[data-id="experience"]').click();
    await expect(page.locator(".detail-panel h2")).toHaveText(l.evidence);
    await expect(
      page.locator(".detail-panel blockquote").first(),
    ).toContainText("I will not hesitate");
    await page.getByLabel(l.focus, { exact: true }).check();
    await expect(page.locator('.react-flow__node[data-id="reason"]')).toHaveCSS(
      "opacity",
      "0.25",
    );
    await page.getByLabel(l.focus, { exact: true }).uncheck();
    await page.getByRole("button", { name: l.explain, exact: true }).click();
    await expect(page.locator(".explanation")).toContainText(l.note);
    await page.screenshot({
      path: `../docs/screenshots/map-${locale}.png`,
      fullPage: true,
    });
    await page.locator(".detail-panel .anchor-links a").first().click();
    await expect(page.locator(".reader-sheet")).toHaveCount(2);
    await page.locator(".pdf-highlight.current").first().click();
    await expect(page).toHaveURL(/step=experience/);
    await page.getByRole("button", { name: l.next, exact: true }).click();
    await expect(page.locator(".detail-panel h2")).not.toHaveText(l.evidence);
    expect(errors).toEqual([]);
  });
}
test("switching language preserves selected node, expanded state and HTML source", async ({
  page,
}) => {
  await page.goto("/doc/demo-descartes-html");
  await page.locator(".language-switch select").selectOption("en");
  await page
    .getByRole("button", { name: labels.en.expand, exact: true })
    .click();
  await page.locator('.react-flow__node[data-id="personal"]').click();
  await expect(
    page.frameLocator(".detail-panel iframe").locator(".vrm-highlight").first(),
  ).toBeVisible();
  await page.locator(".language-switch select").selectOption("zh");
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
  await expect(page.locator(".detail-panel h2")).toHaveText(
    "描述经历，不强加规则",
  );
  await page.locator(".detail-panel .anchor-links a").first().click();
  await page.locator(".language-switch select").selectOption("fr");
  await page
    .frameLocator(".reader-pages iframe")
    .locator(".vrm-current")
    .first()
    .click();
  await expect(page).toHaveURL(/step=personal/);
  await expect(page.locator(".detail-panel h2")).toHaveText(
    "Décrire, sans prescrire",
  );
});
test("analysis language is submitted and errors change with the interface", async ({
  page,
}) => {
  let submitted: Record<string, string> = {};
  await page.route("**/api/tasks", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 503,
      json: {
        detail:
          "Renseignez DEEPSEEK_API_KEY dans .env et redémarrez. Vous pouvez explorer la démonstration sans clé.",
      },
    });
  });
  await page.goto("/");
  await page.locator(".language-switch select").selectOption("zh");
  await page.locator("#arxiv").fill("https://arxiv.org/html/2404.16130");
  await page.getByRole("button", { name: "生成图谱" }).click();
  expect(submitted.language).toBe("zh");
  await expect(page.getByRole("alert")).toContainText("示例不需要密钥也能查看");
  await page.locator(".language-switch select").selectOption("en");
  await expect(page.getByRole("alert")).toContainText("without a key");
  await page.getByLabel("Map language", { exact: true }).selectOption("fr");
  await page.getByRole("button", { name: "Build the map" }).click();
  expect(submitted.language).toBe("fr");
});

test("1024px language controls stay inside the window", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/");
  for (const locale of ["zh", "en", "fr"]) {
    await page.locator(".language-switch select").selectOption(locale);
    await expect(page.locator(".analysis-language select")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1024);
    await page.screenshot({
      path: `../docs/screenshots/library-${locale}-1024.png`,
      fullPage: true,
    });
  }
});
