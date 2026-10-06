import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

test.describe('acceso', () => {
  test('las rutas internas exigen sesión', async ({ page }) => {
    for (const path of ['/', '/calendario', '/participa', '/documentos', '/perfil', '/actividades/ACT-031']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    }
    await page.goto('/perfil')
    expect(new URL(page.url()).searchParams.get('next')).toBe('/perfil')
  })

  test('login demo, vuelta a la ruta pedida y logout', async ({ page }) => {
    await page.goto('/participa')
    await page.getByRole('button', { name: /Alba/ }).click()
    await expect(page).toHaveURL('/participa')
    await page.goto('/perfil')
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL('/login')
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('los endpoints internos rechazan peticiones sin token', async ({ request }) => {
    expect((await request.get('/api/agregados')).status()).toBe(401)
    expect((await request.post('/api/revalidar')).status()).toBe(401)
  })
})

test.describe('inicio', () => {
  test('responde a qué viene, qué preparamos y dónde participar', async ({ page }) => {
    await loginAs(page, /Alba/)
    await expect(page.getByRole('heading', { name: 'Lo que estamos haciendo juntos.' })).toBeVisible()
    await expect(page.locator('#proximamente')).toContainText('Próximamente')
    await expect(page.locator('#en-preparacion')).toContainText('lo estamos preparando.')
    await expect(page.locator('#participar')).toContainText('Puedes participar en')
    // Las tarjetas de ámbitos mantienen un ancho legible (no se aplastan en móvil).
    const cardWidth = await page.locator('#participar li').first().evaluate((el) => el.getBoundingClientRect().width)
    expect(cardWidth).toBeGreaterThan(200)
    // Alba es de Álava: Próximamente no muestra actividades de otros territorios si hay de los suyos.
    await expect(page.locator('#proximamente').getByText('Gipuzkoa', { exact: true })).toHaveCount(0)
  })
})

test.describe('inscripciones', () => {
  test('inscribirse, verlo en el perfil y cancelar', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/actividades/ACT-035')
    await expect(page.getByText('7 inscritos')).toBeVisible()
    await page.getByRole('button', { name: 'Inscribirme' }).click()
    await expect(page.getByText('¡Inscripción confirmada!')).toBeVisible()
    await expect(page.getByText('Estás inscrito').first()).toBeVisible()
    await expect(page.getByText('8 inscritos')).toBeVisible()

    await page.goto('/perfil')
    await expect(page.locator('#proximas')).toContainText('Paseo y charla: Bilbao que viene')

    await page.goto('/actividades/ACT-035')
    await page.getByRole('button', { name: 'Cancelar inscripción' }).click()
    await page.getByRole('button', { name: 'Sí, cancelar' }).click()
    await expect(page.getByText('Inscripción cancelada.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Inscribirme' })).toBeVisible()
    await expect(page.getByText('7 inscritos')).toBeVisible()
  })

  test('estados: completo, cerrada, no abierta, cancelada y finalizada', async ({ page }) => {
    await loginAs(page, /Pablo/)
    const cases: [string, string][] = [
      ['ACT-037', 'Plazas completas'],
      ['ACT-040', 'Inscripción cerrada'],
      ['ACT-034', 'Inscripción todavía no abierta'],
      ['ACT-041', 'Actividad cancelada'],
      ['ACT-030', 'Actividad finalizada'],
    ]
    for (const [id, text] of cases) {
      await page.goto(`/actividades/${id}`)
      await expect(page.getByRole('paragraph').filter({ hasText: new RegExp(`^${text}$`) })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Inscribirme' })).toHaveCount(0)
    }
  })

  test('las actividades en borrador o inexistentes no se pueden abrir', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/actividades/ACT-099')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
    await page.goto('/actividades/NO-EXISTE')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
  })

  test('estado vacío útil cuando no hay planes', async ({ page }) => {
    await loginAs(page, /Pablo/)
    for (const id of ['ACT-031', 'ACT-036']) {
      await page.goto(`/actividades/${id}`)
      await page.getByRole('button', { name: 'Cancelar inscripción' }).click()
      await page.getByRole('button', { name: 'Sí, cancelar' }).click()
      await expect(page.getByRole('button', { name: 'Inscribirme' })).toBeVisible()
    }
    await page.goto('/perfil')
    await expect(page.getByText('Todavía no tienes ningún plan')).toBeVisible()
    await expect(page.locator('#proximas').getByRole('link', { name: 'Ver calendario' })).toBeVisible()
  })
})

test.describe('participa', () => {
  test('quiero participar: elegir ámbitos, confirmar, verlo en el perfil y retirarse', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/participa/PRY-001')
    await page.getByRole('button', { name: 'Quiero participar' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Elige al menos un ámbito' })).toBeDisabled()
    await dialog.getByText('Comunicación', { exact: true }).click()
    await dialog.getByText('Logística', { exact: true }).click()
    await dialog.getByRole('button', { name: 'Confirmar participación (2)' }).click()
    await expect(dialog.getByText('¡Cuenta contigo!')).toBeVisible()
    await dialog.getByRole('link', { name: 'Ver mis participaciones' }).click()
    await expect(page.locator('#participaciones')).toContainText('Escuela de verano 2027')
    await expect(page.locator('#participaciones')).toContainText('Comunicación')

    await page.goto('/participa/PRY-001')
    await page.getByRole('button', { name: /Ya participas/ }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Dejar de participar' }).click()
    await expect(page.getByRole('dialog').getByText('Hecho.')).toBeVisible()
  })

  test('las oportunidades cubiertas no se pueden elegir', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/participa/PRY-004')
    await page.getByRole('button', { name: 'Quiero participar' }).first().click()
    await expect(page.getByRole('dialog').getByRole('checkbox', { name: /Contenidos para campus/ })).toBeDisabled()
  })
})

test.describe('filtros y documentos', () => {
  test('el filtro territorial del calendario muestra solo ese territorio', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/calendario')
    await page.getByRole('radio', { name: /Gipuzkoa/ }).click()
    await expect(page).toHaveURL(/t=gipuzkoa/)
    const cards = page.locator('main a[href^="/actividades/"]')
    await expect(cards.first()).toBeVisible()
    for (const text of await cards.allInnerTexts()) expect(text.toUpperCase()).toContain('GIPUZKOA')
  })

  test('vista mensual del calendario', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/calendario?vista=mes')
    await expect(page.getByRole('grid')).toBeVisible()
    await page.getByRole('link', { name: 'Mes siguiente' }).click()
    await expect(page).toHaveURL(/mes=/)
  })

  test('búsqueda, sin resultados y guardar documento', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/documentos')
    await page.getByRole('searchbox', { name: 'Buscar documentos' }).fill('identidad')
    await expect(page).toHaveURL(/q=identidad/)
    await expect(page.getByText('1 documento')).toBeVisible()
    await page.getByRole('button', { name: /Guardar "Manual de identidad visual NNGG"/ }).click()
    await expect(page.getByRole('button', { name: /Quitar "Manual de identidad visual NNGG"/ })).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar documentos' }).fill('zzzzz')
    await expect(page.getByText('Sin resultados')).toBeVisible()

    await page.goto('/perfil')
    await expect(page.locator('#guardados')).toContainText('Manual de identidad visual NNGG')
  })
})

test.describe('permisos', () => {
  test('un afiliado no ve listados nominales', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/actividades/ACT-031')
    await expect(page.getByText('Gestión · Inscritos')).toHaveCount(0)
  })

  test('la dirección provincial solo ve su territorio', async ({ page }) => {
    await loginAs(page, /Miguel/)
    await page.goto('/actividades/ACT-035')
    await expect(page.getByText('Gestión · Inscritos')).toBeVisible()
    await page.goto('/actividades/ACT-032')
    await expect(page.getByText('Gestión · Inscritos')).toHaveCount(0)
    await page.goto('/participa/PRY-004')
    await expect(page.getByText('Gestión · Personas que se han ofrecido')).toBeVisible()
  })

  test('la dirección de Euskadi ve todos los territorios', async ({ page }) => {
    await loginAs(page, /Adrián/)
    await page.goto('/actividades/ACT-032')
    await expect(page.getByText('Gestión · Inscritos')).toBeVisible()
  })
})

test.describe('PWA y navegación', () => {
  test('manifest, service worker e iconos disponibles sin sesión', async ({ request }) => {
    const manifest = await (await request.get('/manifest.webmanifest')).json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
    expect((await request.get('/sw.js')).ok()).toBe(true)
    expect((await request.get('/icons/icon-512.png')).ok()).toBe(true)
    expect((await request.get('/offline.html')).ok()).toBe(true)
  })

  test('navegación principal entre las cinco secciones', async ({ page, isMobile }) => {
    await loginAs(page, /Alba/)
    const nav = page.getByRole('navigation', { name: 'Principal' }).filter({ visible: true })
    const sections: [string, string][] = [
      ['Calendario', '/calendario'],
      ['Participa', '/participa'],
      ['Documentos', '/documentos'],
      ['Perfil', '/perfil'],
      ['Inicio', '/'],
    ]
    for (const [label, url] of sections) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(url)
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
    }
    // Sin scroll horizontal en ninguna pantalla.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, isMobile ? 'móvil' : 'escritorio').toBeLessThanOrEqual(0)
  })
})

test.describe('campaña principal y calendario', () => {
  test('Inicio y Participa muestran la Campaña 29N como bloque principal', async ({ page }) => {
    await loginAs(page, /Alba/)
    const block = page.locator('#campana')
    await expect(block.getByRole('heading', { name: 'Campaña 29N' })).toBeVisible()
    await expect(block.getByRole('button', { name: 'Quiero participar' })).toBeVisible()
    await page.goto('/participa')
    await expect(page.locator('#campana').getByRole('heading', { name: 'Campaña 29N' })).toBeVisible()
    // No se repite en la lista de proyectos.
    await expect(page.locator('main article').filter({ hasText: 'Campaña 29N' })).toHaveCount(0)
  })

  test('sin cupos: nunca se muestra "faltan personas"', async ({ page }) => {
    await loginAs(page, /Pablo/)
    for (const path of ['/', '/participa', '/participa/PRY-001']) {
      await page.goto(path)
      await expect(page.getByText(/Faltan? \d|Necesitamos \d|Hace falta gente/)).toHaveCount(0)
    }
  })

  test('añadir una actividad al calendario descarga un evento .ics', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/actividades/ACT-031')
    const link = page.getByRole('link', { name: 'Añadir a mi calendario' })
    await expect(link).toBeVisible()
    const response = await page.request.get((await link.getAttribute('href'))!)
    expect(response.headers()['content-type']).toContain('text/calendar')
    const body = await response.text()
    expect(body).toContain('SUMMARY:Encuentro NNGG Euskadi')
    await expect(page.getByRole('link', { name: /Google Calendar/ })).toHaveAttribute('href', /calendar\.google\.com/)
  })

  test('el .ics exige sesión', async ({ request }) => {
    const response = await request.get('/actividades/ACT-031/ics', { maxRedirects: 0 })
    expect([307, 401]).toContain(response.status())
  })
})

test.describe('intereses', () => {
  test('cada persona elige como máximo 3 intereses y se guardan', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/perfil#intereses')
    const section = page.locator('#intereses')
    await expect(section.getByText('1 de 3')).toBeVisible()
    await section.getByText('Vivienda', { exact: true }).click()
    await section.getByText('Debate y oratoria', { exact: true }).click()
    await expect(section.getByText('3 de 3')).toBeVisible()
    await expect(section.getByRole('checkbox', { name: 'Inmigración' })).toBeDisabled()
    await section.getByRole('button', { name: 'Guardar intereses' }).click()
    await expect(section.getByText('Intereses guardados.')).toBeVisible()
    await page.reload()
    await expect(page.locator('#intereses').getByText('3 de 3')).toBeVisible()
    await expect(page.locator('#intereses').getByRole('checkbox', { name: 'Vivienda' })).toBeChecked()
  })
})
