import { test, expect } from "@playwright/test";
test("SAMPLE demo: complete three questions", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("http://127.0.0.1:3001/login");
  await page.getByRole("button", { name: "Need an account? Register" }).click();
  await page.getByLabel("Email").fill(`demo-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("test-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/setup/);
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page).toHaveURL(/\/interview\//, { timeout: 30000 });
  await expect(page.getByText("SAMPLE DEMO · SIMULATED FEEDBACK")).toBeVisible({
    timeout: 30000,
  });
  for (let i = 0; i < 3; i++) {
    await page
      .getByLabel("Your answer")
      .fill(
        "I would start with a clear baseline and use representative examples to evaluate the results before making changes.",
      );
    await page.getByRole("button", { name: "Submit answer" }).click();
    if (i < 2)
      await expect(page.getByText(`Question ${i + 2} of 3`)).toBeVisible({
        timeout: 30000,
      });
  }
  await expect(page.getByText("Session complete", { exact: true })).toBeVisible(
    { timeout: 30000 },
  );
  await expect(page.getByText("SAMPLE feedback:").first()).toBeVisible({
    timeout: 30000,
  });
  await page.reload();
  await expect(page.getByText("Session complete", { exact: true })).toBeVisible(
    { timeout: 30000 },
  );
  await page.getByRole("link", { name: "View report" }).click();
  await expect(
    page.getByText("SAMPLE DEMO REPORT · SIMULATED SCORES"),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("A simple 7-day practice plan")).toBeVisible();
  await page.pdf({
    path: "docs/SAMPLE_report.pdf",
    format: "A4",
    printBackground: true,
  });
});
