import { test, expect } from '@playwright/test';

test.describe('Flujo PWA Offline-First de Control de Perforación', () => {
  test('debe permitir iniciar sesión y acceder al panel operacional', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'operador@zaldivar.cl');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Panel Operacional de Terreno');
  });

  test('debe navegar al formulario de nuevo procedimiento', async ({ page }) => {
    await page.goto('/');
    await page.click('text=NUEVO PROCEDIMIENTO');
    await expect(page).toHaveURL('/procedures/new');
    await expect(page.locator('h1')).toContainText('Nuevo Procedimiento de Perforación');
  });
});
