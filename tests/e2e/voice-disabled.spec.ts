import { test, expect } from "@playwright/test";
test.use({
  permissions: ["microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});
test("voice unavailable leaves text usable", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("http://127.0.0.1:3001/login");
  await page.getByRole("button", { name: "Need an account? Register" }).click();
  await page.getByLabel("Email").fill(`voice-${Date.now()}@example.test`);
  await page.getByLabel("Password").fill("test-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/setup/, { timeout: 30000 });
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(
    page.getByRole("button", { name: "Record voice answer" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Record voice answer" }).click();
  await expect(
    page.getByRole("button", { name: "Stop recording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(
    page.getByText("Voice transcription is unavailable. Please use text."),
  ).toBeVisible({ timeout: 30000 });
  await page
    .getByLabel("Your answer")
    .fill(
      "This is a text answer that works even when voice is unavailable and has enough detail for this demo.",
    );
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByText("Question 2 of 3")).toBeVisible({
    timeout: 30000,
  });
});
