import { expect, test } from "@playwright/test";

// These smoke tests exercise the login screen and the auth guard without
// needing a signed-in user. Flows that need a real session (create a skill,
// start the timer, log hours, see a milestone celebration) are documented
// in README's "Known limitations" as needing the Firebase emulator suite
// wired into CI — out of scope for this pass, but this file is the place to
// add them once that's set up.

test("redirects an unauthenticated visitor from the dashboard to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("login screen renders email/password and Google options", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Bienvenido de nuevo/i })).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: /Continuar con Google/i })).toBeVisible();
});

test("toggles between login and register copy", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /¿No tienes cuenta\?/i }).click();
  await expect(page.getByRole("heading", { name: /Empieza tu camino/i })).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeVisible();
});
