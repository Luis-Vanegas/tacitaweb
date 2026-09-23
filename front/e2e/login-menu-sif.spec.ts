import { test, expect } from '@playwright/test'

// Flujo: login -> menú -> SIF -> filtrar "Alerta precontractual" -> abrir proceso.
// NO CORRIDO EN ESTA SESIÓN: el backend real (NestJS + Supabase) no está
// disponible (falla la conexión a Supabase y Docker Desktop no está corriendo,
// ver docs/PLAN-IMPLEMENTACION.md Fase 3/4). Queda escrito para correrlo con
// `npm run test:e2e` en cuanto el backend esté arriba en :3000.
//
// Credenciales: usar un usuario real creado con `npm run crear-admin` en back/.
const EMAIL = process.env.E2E_EMAIL ?? 'admin@tacitaweb.local'
const PASSWORD = process.env.E2E_PASSWORD ?? 'changeme'

test.describe('login → menú → SIF → filtrar → abrir proceso', () => {
  test('flujo completo', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(EMAIL)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Frentes' })).toBeVisible()

    await page.getByRole('button', { name: /Abrir frente SIF/ }).click()
    await expect(page).toHaveURL(/\/frentes\/sif/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/SIF/i)

    // Filtro "Alerta precontractual": combinación de fase + estado de alerta.
    // Se filtra por fase Precontractual desde el select de ProcesosTab; el
    // estado puntual "Alerta precontractual" depende del catálogo real cargado.
    await page.getByLabel('Fase').click()
    await page.getByRole('option', { name: 'Precontractual' }).click()

    const primeraFila = page.getByRole('row').nth(1)
    await expect(primeraFila).toBeVisible()
    await primeraFila.click()

    await expect(page).toHaveURL(/\/procesos\//)
  })
})
