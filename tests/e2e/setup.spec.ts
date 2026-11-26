import { test, expect } from "@playwright/test";

test("configuration survives page reload with Firebase emulators", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3001/login");
  await page.getByRole("button", { name: "Need an account? Register" }).click();
  await page.getByLabel("Email").fill(`test-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("test-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/setup/);
  await page.getByLabel("Role").selectOption("ML Engineer");
  await page.getByLabel("Seniority").selectOption("senior");
  await page
    .getByLabel("Job description (optional)")
    .fill("SAMPLE: emulator-only configuration");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(
    page
      .getByRole("status")
      .getByText(
        "Configuration saved. It will be available here when you return.",
      ),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").getByText("SAMPLE: emulator-only configuration"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("SAMPLE: emulator-only configuration"),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").getByText("ML Engineer", { exact: true }),
  ).toBeVisible();
});
