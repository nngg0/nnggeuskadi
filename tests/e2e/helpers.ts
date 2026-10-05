import { expect, type Page } from '@playwright/test'

export async function loginAs(page: Page, name: RegExp | string) {
  await page.goto('/login')
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL('/')
}
