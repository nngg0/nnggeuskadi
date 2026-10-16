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
    const cards = page.locator('main article')
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
      ['Actos', '/calendario'],
      ['Proyectos', '/participa'],
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
    const link = page.getByRole('link', { name: 'Añadir «Encuentro NNGG Euskadi» al calendario del iPhone' })
    await expect(link).toBeVisible()
    const response = await page.request.get((await link.getAttribute('href'))!)
    expect(response.headers()['content-type']).toContain('text/calendar')
    const body = await response.text()
    expect(body).toContain('SUMMARY:Encuentro NNGG Euskadi')
    await expect(page.getByRole('link', { name: 'Añadir «Encuentro NNGG Euskadi» a Google Calendar' })).toHaveAttribute('href', /calendar\.google\.com/)
  })

  test('las tarjetas de actos próximos llevan iPhone y Google Calendar; las pasadas no', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/calendario')
    const card = page.locator('article', { hasText: 'Encuentro NNGG Euskadi' })
    await expect(card.getByRole('link', { name: /al calendario del iPhone/ })).toHaveAttribute('href', '/actividades/ACT-031/ics')
    await expect(card.getByRole('link', { name: /a Google Calendar/ })).toHaveAttribute('href', /calendar\.google\.com/)
    await expect(page.locator('#pasados').getByRole('link', { name: /iPhone|Google Calendar/ })).toHaveCount(0)
    // El resto de la tarjeta sigue abriendo la ficha.
    await card.getByRole('heading').click()
    await expect(page).toHaveURL('/actividades/ACT-031')
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

test.describe('solicitar acceso y miembros', () => {
  test('cualquiera puede solicitar acceso desde la entrada', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Solicitar acceso' }).click()
    await expect(page).toHaveURL('/solicitar-acceso')
    await expect(page.getByLabel('Territorio')).toHaveCount(0)
    await page.getByLabel('Nombre', { exact: true }).fill('Santiago López')
    await page.getByLabel('Nombre de usuario').fill('santiago.lopez')
    await page.getByLabel('Contraseña (mínimo 10 caracteres)').fill('una-clave-larga')
    await page.getByLabel('Repite la contraseña').fill('otra-clave-larga')
    await page.getByRole('button', { name: 'Solicitar acceso' }).click()
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    await page.getByLabel('Repite la contraseña').fill('una-clave-larga')
    await page.getByRole('button', { name: 'Solicitar acceso' }).click()
    await expect(page.getByText(/Solicitud enviada/)).toBeVisible()
  })

  test('Administración aprueba con rol y la persona aparece en Miembros', async ({ page }) => {
    await loginAs(page, /Administración/)
    await expect(page.getByRole('link', { name: /2 solicitudes de acceso pendientes/ })).toBeVisible()
    await page.goto('/solicitudes')
    await expect(page.getByText('santiago.lopez', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Aprobar a Santiago López' }).click()
    await expect(page.getByText('Elige su provincia.')).toBeVisible()
    const province = page.getByRole('combobox', { name: 'Provincia para Santiago López' })
    await expect(province.getByRole('option', { name: 'Euskadi' })).toHaveCount(0)
    await province.selectOption('bizkaia')
    await page.getByRole('combobox', { name: 'Rol para Santiago López' }).selectOption('direccion_provincial')
    await page.getByRole('button', { name: 'Aprobar a Santiago López' }).click()
    await expect(page.getByText('Solicitud aprobada. Ya puede entrar.')).toBeVisible()
    await page.locator('li', { hasText: 'Josetxo López' }).getByRole('button', { name: 'Rechazar' }).click()
    await page.getByRole('button', { name: 'Sí, rechazar' }).click()
    await expect(page.getByText('Solicitud rechazada.')).toBeVisible()
    await page.goto('/miembros')
    const row = page.locator('li', { hasText: 'Santiago López' })
    await expect(row).toContainText('Dirección provincial')
    await expect(row).toContainText('Bizkaia')
    await expect(page.getByText('Josetxo López')).toHaveCount(0)
  })

  test('la dirección provincial ve el listado de su provincia y no aprueba', async ({ page }) => {
    await loginAs(page, /Miguel/)
    await page.goto('/perfil')
    await expect(page.getByRole('link', { name: /Miembros/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Solicitudes de acceso/ })).toHaveCount(0)
    await page.goto('/miembros')
    await expect(page.getByText('Pablo Folgado')).toBeVisible()
    await expect(page.getByText('Alba', { exact: true })).toHaveCount(0)
    await page.goto('/solicitudes')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
  })

  test('un afiliado no ve gestión', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/perfil')
    await expect(page.locator('#gestion')).toHaveCount(0)
    await page.goto('/miembros')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
    await page.goto('/solicitudes')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
  })
})

test.describe('alta de actividades y proyectos', () => {
  const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

  test('la dirección provincial crea una actividad en su provincia y aparece en el calendario', async ({ page }) => {
    await loginAs(page, /Miguel/)
    await page.goto('/calendario')
    await page.getByRole('link', { name: 'Nuevo acto' }).click()
    await expect(page).toHaveURL('/calendario/nueva')
    const territory = page.getByLabel('Territorio')
    await expect(territory.getByRole('option')).toHaveText(['Bizkaia'])
    await page.getByLabel('Título').fill('Pintxo-pote de bienvenida')
    await page.getByLabel('Fecha').fill(inDays(15))
    await page.getByLabel('Hora').fill('20:00')
    await page.getByLabel('Lugar').fill('Bilbao · Casco Viejo')
    await page.getByLabel('Plazas').fill('25')
    await page.getByRole('button', { name: 'Crear acto' }).click()
    await expect(page).toHaveURL(/\/actividades\/ACT-\d+$/)
    await expect(page.getByRole('heading', { name: 'Pintxo-pote de bienvenida' })).toBeVisible()
    await page.goto('/calendario?t=bizkaia')
    await expect(page.getByText('Pintxo-pote de bienvenida')).toBeVisible()
  })

  test('el servidor rechaza crear fuera de su provincia aunque se manipule el formulario', async ({ page }) => {
    await loginAs(page, /Miguel/)
    await page.goto('/calendario/nueva')
    // Esperar a que la página esté hidratada: si no, React descarta la opción añadida a mano.
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Territorio').evaluate((select: HTMLSelectElement) => {
      select.add(new Option('Álava', 'alava'))
      select.value = 'alava'
    })
    await page.getByLabel('Título').fill('Acto en Álava')
    await page.getByLabel('Fecha').fill(inDays(10))
    await page.getByRole('button', { name: 'Crear acto' }).click()
    await expect(page.getByText('No puedes crear contenido en ese territorio.')).toBeVisible()
    await expect(page.getByLabel('Título')).toHaveValue('Acto en Álava')
  })

  test('la dirección regional crea un proyecto con ámbitos y se puede participar', async ({ page }) => {
    await loginAs(page, /Adrián/)
    await page.goto('/participa')
    await page.getByRole('link', { name: 'Nuevo proyecto' }).click()
    await expect(page.getByLabel('Territorio').getByRole('option')).toHaveCount(4)
    await page.getByLabel('Territorio').selectOption('euskadi')
    await page.getByLabel('Título').fill('Ruta por los pueblos')
    await page.getByLabel('Descripción', { exact: true }).fill('Recorremos los pueblos en verano.')
    await page.getByLabel('Nombre del ámbito 1').fill('Logística')
    await page.getByRole('button', { name: 'Añadir ámbito' }).click()
    await page.getByLabel('Nombre del ámbito 2').fill('Redes sociales')
    await page.getByRole('button', { name: 'Crear proyecto' }).click()
    await expect(page).toHaveURL(/\/participa\/PRY-\d+$/)
    await expect(page.getByRole('heading', { name: 'Ruta por los pueblos' })).toBeVisible()
    await expect(page.getByText('Logística').first()).toBeVisible()
    await page.goto('/participa')
    await expect(page.getByText('Ruta por los pueblos')).toBeVisible()
  })

  test('un afiliado no ve el botón «+» ni puede abrir los formularios', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/calendario')
    await expect(page.getByRole('link', { name: 'Nuevo acto' })).toHaveCount(0)
    await page.goto('/participa')
    await expect(page.getByRole('link', { name: 'Nuevo proyecto' })).toHaveCount(0)
    await page.goto('/calendario/nueva')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
    await page.goto('/participa/nuevo')
    await expect(page.getByText('Esto ya no está aquí.')).toBeVisible()
  })
})

test.describe('inicio, actos y proyectos', () => {
  test('Inicio saluda, enseña la campaña, los cinco actos más próximos y lo que estamos preparando', async ({ page }) => {
    await loginAs(page, /Alba/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Alba')
    await expect(page.getByText('Lo que estamos haciendo juntos.')).toHaveCount(0)
    const campaign = page.locator('#campana')
    await expect(campaign.getByText(/^actos?$/)).toBeVisible()
    await expect(campaign.getByText(/personas participan/)).toHaveCount(0)
    await expect(campaign.getByText(/^días?$/)).toBeVisible()
    await expect(page.locator('#proximamente').locator('h3 a[href^="/actividades/"]')).toHaveCount(5)
    await expect(page.locator('#proximamente').getByRole('link', { name: 'Ver calendario completo' }).first()).toBeVisible()
    const preparing = page.locator('#en-preparacion')
    await expect(preparing.getByRole('heading', { name: 'Esto todavía lo estamos preparando.' })).toBeVisible()
    await expect(preparing.getByText('Mesa redonda de economía con Álvaro Gotxi')).toBeVisible()
  })

  test('la campaña ofrece sus cinco ámbitos al pulsar «Quiero participar»', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.locator('#campana').getByRole('button', { name: 'Quiero participar' }).click()
    const dialog = page.getByRole('dialog')
    for (const name of ['Redes sociales', 'Ideas y propuestas', 'Acciones en la calle', 'Coordinación', 'Voto por correo']) {
      await expect(dialog.getByText(name, { exact: true })).toBeVisible()
    }
    await expect(dialog.getByRole('checkbox')).toHaveCount(5)
  })

  test('Debate: organización y formar parte de un equipo', async ({ page }) => {
    await loginAs(page, /Pablo/)
    await page.goto('/participa/PRY-DEBATE')
    await page.getByRole('button', { name: 'Quiero participar' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Organización', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Formar parte de un equipo', { exact: true })).toBeVisible()
  })

  test('mesa redonda de economía en Álava con sus formas de participar', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/participa/PRY-007')
    await expect(page.getByRole('heading', { name: 'Mesa redonda de economía con Álvaro Gotxi' })).toBeVisible()
    await expect(page.getByText(/por confirmar/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Quiero participar' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Preparar preguntas', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Redes sociales', { exact: true })).toBeVisible()
  })

  test('en Actos lo que ya ha pasado va al final y en gris', async ({ page }) => {
    await loginAs(page, /Alba/)
    await page.goto('/calendario')
    const past = page.locator('#pasados')
    await expect(past.getByText('Asamblea de inicio de curso')).toBeVisible()
    await expect(past.locator('.grayscale')).toHaveCount(1)
    // La sección de pasados es lo último de la lista.
    const order = await page.locator('main h3 a[href^="/actividades/"]').evaluateAll((links) =>
      links.map((l) => l.textContent ?? ''),
    )
    expect(order.at(-1)).toContain('Asamblea de inicio de curso')
  })
})

test('Proyectos: «Lo que está entre manos» y el texto de la campaña', async ({ page }) => {
  await loginAs(page, /Alba/)
  await page.goto('/participa')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lo que está entre manos')
  await expect(page.getByText('Elige de qué proyecto quieres formar parte.')).toBeVisible()
  await expect(page.locator('#campana').getByText('¡POR FIN! Esta campaña la construimos entre todos.', { exact: false })).toBeVisible()
})

test('calendario: botones solo en Actos y mes con la campaña destacada', async ({ page }) => {
  await loginAs(page, /Alba/)
  await expect(page.locator('#proximamente').getByRole('link', { name: /iPhone|Google Calendar/ })).toHaveCount(0)
  await page.goto('/calendario?vista=mes&mes=2026-11')
  const grid = page.getByRole('grid')
  await expect(grid.getByLabel(/^29, día de la campaña/)).toBeVisible()
  await expect(grid.getByLabel(/^13, campaña electoral/)).toBeVisible()
  await expect(grid.getByLabel(/^27, campaña electoral/)).toBeVisible()
  await expect(grid.getByLabel(/^12(, |$)/)).not.toHaveAttribute('aria-label', /campaña/)
})

test('Proyectos: la campaña entre banderitas, con «Ver la campaña» como botón principal', async ({ page }) => {
  await loginAs(page, /Pablo/)
  await page.goto('/participa')
  const buttons = page.locator('#campana').locator('a, button').filter({ hasText: /Ver la campaña|Quiero participar/ })
  await expect(buttons.nth(0)).toHaveText(/Ver la campaña/)
  await expect(buttons.nth(1)).toHaveText(/Quiero participar/)
})

test('la hoja de participar bloquea el fondo solo mientras está abierta y devuelve el scroll', async ({ page }) => {
  await loginAs(page, /Pablo/)
  await page.goto('/participa')
  const card = page.locator('article', { hasText: 'Debate' })
  await card.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.scrollY)
  await card.getByRole('button', { name: 'Quiero participar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Formar parte de un equipo', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.body.style.position)).toBe('fixed')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => [document.body.style.position, document.body.style.overflow])).toEqual(['', ''])
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThan(2)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})
