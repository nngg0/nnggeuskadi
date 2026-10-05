import { addDays, madridDate } from '@/lib/domain/dates'
import type { RawTable, RawWorkbook } from '@/lib/sheets/columns'

/*
 * DATOS DEMO — contenido organizativo de ejemplo.
 *
 * Se escriben con el MISMO formato que las hojas de Google Sheets y pasan por el mismo
 * validador (src/lib/sheets/parse.ts), de modo que la demo ejercita el camino real.
 * Las fechas son relativas a hoy para que la demo nunca quede desfasada.
 *
 * Para eliminar la demo basta con borrar la carpeta src/demo y las referencias a ella en
 * src/lib/content/source.ts y src/lib/personal/index.ts (ver README).
 */

function d(offset: number, today: string): string {
  const iso = addDays(today, offset)
  const [y, m, day] = iso.split('-')
  return `${day}/${m}/${y}` // formato habitual de un Sheet en español
}

function table(header: string[], rows: string[][]): RawTable {
  return [header, ...rows]
}

export function demoWorkbook(now: Date = new Date()): RawWorkbook {
  const t = madridDate(now)
  const D = (offset: number) => d(offset, t)
  // Campaña 29N: el próximo 29 de noviembre (o el de este año si aún no ha pasado).
  const year = Number(t.slice(0, 4))
  const n29 = t <= `${year}-11-29` ? `${year}-11-29` : `${year + 1}-11-29`
  const D29N = (offset = 0) => {
    const [y, m, day] = addDays(n29, offset).split('-')
    return `${day}/${m}/${y}`
  }

  return {
    ACTIVIDADES: table(
      ['id', 'titulo', 'descripcion', 'territorio', 'fecha', 'hora', 'lugar', 'plazas', 'inscripcion_inicio', 'inscripcion_fin', 'estado', 'visible', 'destacado'],
      [
        ['ACT-031', 'Encuentro NNGG Euskadi', 'Nos juntamos afiliados de los tres territorios para arrancar el curso político: balance, prioridades del año y espacio para proponer iniciativas.\n\nHabrá un pequeño picoteo al terminar.', 'Euskadi', D(9), '18:30', 'Vitoria-Gasteiz · Palacio Europa', '80', D(-10), D(7), 'confirmada', 'sí', 'sí'],
        ['ACT-029', 'Arranque de la Campaña 29N', 'Presentamos la campaña y repartimos tareas. Si te has apuntado en Participa, este es tu sitio; si no, también.', 'Euskadi', D(4), '19:00', 'Bilbao · Sede PP Bizkaia', '', '', '', 'confirmada', 'sí', 'no'],
        ['ACT-032', 'Formación: hablar en público', 'Taller práctico para perder el miedo al micrófono: estructura, voz y cómo responder preguntas difíciles.', 'Álava', D(3), '19:00', 'Vitoria-Gasteiz · Sede PP Álava', '20', D(-14), D(2), 'confirmada', 'sí', 'no'],
        ['ACT-033', 'Mesa informativa en la Universidad', 'Repartimos información sobre la campaña de vivienda joven en el campus de Leioa.', 'Bizkaia', D(2), '11:00', 'Leioa · Campus UPV/EHU', '12', D(-7), D(1), 'confirmada', 'sí', 'no'],
        ['ACT-034', 'Cena de Navidad NNGG Gipuzkoa', 'La cena de todos los años para cerrar el curso con los compañeros de Gipuzkoa.', 'Gipuzkoa', D(40), '21:00', 'Donostia · Restaurante del Puerto', '60', D(5), D(35), 'confirmada', 'sí', 'no'],
        ['ACT-035', 'Paseo y charla: Bilbao que viene', 'Recorrido por Zorrotzaurre con una urbanista para hablar del Bilbao de los próximos 20 años.', 'Bizkaia', D(12), '11:30', 'Bilbao · Puente de Deusto', '25', D(-5), D(10), 'confirmada', 'sí', 'no'],
        ['ACT-036', 'Reunión de afiliados de Álava', 'Reunión abierta para preparar el calendario del trimestre en Álava.', 'Álava', D(6), '19:30', 'Vitoria-Gasteiz · Sede PP Álava', '', '', '', 'confirmada', 'sí', 'no'],
        ['ACT-037', 'Debate interno: Europa y los jóvenes', 'Formato debate con dos equipos. Plazas completas: puedes venir de público.', 'Euskadi', D(5), '18:00', 'Bilbao · Sede PP Bizkaia', '16', D(-20), D(4), 'confirmada', 'sí', 'no'],
        ['ACT-038', 'Escuela de verano 2027 · Presentación', 'Presentación pública del programa. La inscripción se abrirá más adelante.', 'Euskadi', D(55), '12:00', 'Donostia · Palacio Miramar', '150', D(30), D(50), 'confirmada', 'sí', 'no'],
        ['ACT-039', 'Voluntariado Banco de Alimentos', 'Jornada de recogida en supermercados de Donostialdea. Turnos de mañana.', 'Gipuzkoa', D(16), '09:30', 'Donostia · Varios supermercados', '30', D(-3), D(14), 'confirmada', 'sí', 'no'],
        ['ACT-040', 'Torneo de pádel solidario', 'Inscripción cerrada por la organización. Puedes venir a animar.', 'Bizkaia', D(20), '10:00', 'Getxo · Club Fadura', '32', D(-30), D(-1), 'cerrada', 'sí', 'no'],
        ['ACT-041', 'Charla con concejales jóvenes', 'Aplazada hasta nueva fecha.', 'Gipuzkoa', D(8), '19:00', 'Eibar', '40', D(-10), D(7), 'cancelada', 'sí', 'no'],
        ['ACT-042', 'Café político: fiscalidad joven', 'Conversación informal sobre impuestos, primer empleo y emancipación.', 'Álava', D(24), '18:30', 'Vitoria-Gasteiz · Café Dublin', '18', D(-2), D(22), 'confirmada', 'sí', 'no'],
        ['ACT-030', 'Asamblea de inicio de curso', 'Actividad pasada (sirve para ver el histórico).', 'Euskadi', D(-12), '18:00', 'Bilbao', '100', D(-40), D(-14), 'confirmada', 'sí', 'no'],
        ['ACT-099', 'Borrador interno', 'Esta fila tiene estado borrador y no debe verse.', 'Euskadi', D(30), '18:00', 'Bilbao', '20', '', '', 'borrador', 'sí', 'no'],
      ],
    ),
    PROYECTOS: table(
      ['id', 'titulo', 'descripcion', 'tipo', 'territorio', 'estado', 'fecha_inicio', 'fecha_prevista', 'visible', 'destacado'],
      [
        ['PRY-29N', 'Campaña 29N', 'La gran campaña de este curso. Queremos construirla entre todos: ideas, presencia en la calle y en redes, diseño y organización. Apúntate en lo que quieras y cuando quieras; cuanta más gente, mejor.', 'Campaña', 'Euskadi', 'en_preparacion', D(-10), D29N(), 'sí', 'sí'],
        ['PRY-DEBATE', 'Debate', 'Todavía hay pocos detalles, pero ya puedes apuntarte para ayudar a organizarlo.', '', 'Euskadi', 'en_preparacion', '', '', 'sí', 'no'],
        ['PRY-001', 'Escuela de verano 2027', 'Estamos empezando a preparar la próxima escuela de verano. Todavía no hay programa, ni ponentes, ni sede cerrada: es el mejor momento para entrar y darle forma con nosotros.', 'Formación', 'Euskadi', 'en_preparacion', D(-7), D(270), 'sí', 'sí'],
        ['PRY-002', 'Vivienda joven', 'Estamos preparando una nueva campaña sobre vivienda joven: propuestas, materiales y acciones en la calle. Buscamos ideas antes de cerrar el mensaje.', 'Campaña', 'Euskadi', 'en_preparacion', D(-14), D(60), 'sí', 'sí'],
        ['PRY-003', 'Ciclo de cafés políticos en Álava', 'Queremos organizar un café político al mes en Vitoria-Gasteiz con invitados distintos. Falta definir temas, invitados y lugares.', 'Evento', 'Álava', 'en_preparacion', D(-3), D(30), 'sí', 'no'],
        ['PRY-004', 'NNGG en los campus de Bizkaia', 'Preparamos presencia estable en Leioa, Sarriko y Deusto durante el curso.', 'Campaña', 'Bizkaia', 'en_preparacion', D(-20), D(45), 'sí', 'no'],
        ['PRY-005', 'Guía del afiliado de Gipuzkoa', 'Una guía práctica para nuevos afiliados: a quién llamar, cómo participar y qué hacemos.', 'Organización', 'Gipuzkoa', 'en_preparacion', D(-5), D(80), 'sí', 'no'],
        ['PRY-006', 'Campaña de afiliación', 'La campaña ya está en marcha; quedan algunos huecos en redes.', 'Campaña', 'Euskadi', 'en_marcha', D(-60), D(20), 'sí', 'no'],
      ],
    ),
    OPORTUNIDADES: table(
      ['id', 'proyecto_id', 'nombre', 'descripcion', 'fecha_limite', 'estado', 'visible'],
      [
        ['OP-29N-1', 'PRY-29N', 'Ideas y propuestas', 'Qué mensajes, acciones y formatos debería tener la campaña.', D29N(-1), 'abierta', 'sí'],
        ['OP-29N-2', 'PRY-29N', 'Redes sociales', 'Vídeos, publicaciones y difusión durante toda la campaña.', '', 'abierta', 'sí'],
        ['OP-29N-3', 'PRY-29N', 'Acciones en la calle', 'Mesas informativas y acciones en cada territorio.', '', 'abierta', 'sí'],
        ['OP-29N-4', 'PRY-29N', 'Diseño', 'Cartelería, lonas y piezas gráficas.', '', 'abierta', 'sí'],
        ['OP-29N-5', 'PRY-29N', 'Organización', 'Coordinar equipos, calendario y convocatorias.', '', 'abierta', 'sí'],
        ['OP-29N-6', 'PRY-29N', 'Logística', 'Material, desplazamientos y montaje.', '', 'abierta', 'sí'],
        ['OP-DEB-1', 'PRY-DEBATE', 'Organización', 'Formato, fechas, sede y equipos: todo está por decidir.', '', 'abierta', 'sí'],
        ['OP-001', 'PRY-001', 'Ideas', 'Propón temas, formatos o ponentes para la escuela.', D(45), 'abierta', 'sí'],
        ['OP-002', 'PRY-001', 'Contenidos', 'Ayuda a preparar las sesiones y materiales.', D(90), 'abierta', 'sí'],
        ['OP-003', 'PRY-001', 'Comunicación', 'Redes sociales, fotos y vídeo durante la preparación y la escuela.', D(120), 'abierta', 'sí'],
        ['OP-004', 'PRY-001', 'Organización', 'Coordinación de horarios, sede y participantes.', D(120), 'abierta', 'sí'],
        ['OP-005', 'PRY-001', 'Logística', 'Transporte, alojamiento y material.', D(150), 'abierta', 'sí'],
        ['OP-006', 'PRY-002', 'Ideas', 'Propuestas concretas que debería defender la campaña.', D(20), 'abierta', 'sí'],
        ['OP-007', 'PRY-002', 'Diseño', 'Carteles, piezas para redes y lonas.', D(25), 'abierta', 'sí'],
        ['OP-008', 'PRY-002', 'Redes sociales', 'Vídeos cortos y difusión.', D(30), 'abierta', 'sí'],
        ['OP-009', 'PRY-002', 'Organización', 'Coordinar acciones de calle en cada territorio.', D(30), 'abierta', 'sí'],
        ['OP-010', 'PRY-002', 'Logística', 'Mesas, material y desplazamientos.', D(35), 'abierta', 'sí'],
        ['OP-011', 'PRY-003', 'Proponer temas e invitados', '', D(15), 'abierta', 'sí'],
        ['OP-012', 'PRY-003', 'Buscar lugares', 'Cafeterías o espacios donde podamos reunirnos.', D(15), 'abierta', 'sí'],
        ['OP-013', 'PRY-004', 'Mesas informativas', 'Mesas en Leioa, Sarriko y Deusto durante octubre.', D(10), 'abierta', 'sí'],
        ['OP-014', 'PRY-004', 'Contenidos para campus', 'Folletos y argumentario universitario.', D(25), 'cerrada', 'sí'],
        ['OP-015', 'PRY-005', 'Redacción', 'Escribir y revisar los capítulos de la guía.', D(40), 'abierta', 'sí'],
        ['OP-016', 'PRY-005', 'Diseño', 'Maquetación de la guía.', D(50), 'abierta', 'sí'],
        ['OP-017', 'PRY-006', 'Redes sociales', 'Últimos vídeos de la campaña.', D(12), 'abierta', 'sí'],
      ],
    ),
    DOCUMENTOS: table(
      ['id', 'titulo', 'descripcion', 'categoria', 'territorio', 'url', 'fecha', 'destacado', 'visible'],
      [
        ['DOC-001', 'Argumentario de vivienda joven', 'Datos, propuestas y respuestas a las preguntas más habituales.', 'Argumentarios', 'Euskadi', 'https://example.org/docs/argumentario-vivienda.pdf', D(-4), 'sí', 'sí'],
        ['DOC-002', 'Manual de identidad visual NNGG', 'Logotipos, colores, tipografías y usos correctos.', 'Material gráfico', 'Euskadi', 'https://example.org/docs/manual-identidad.pdf', D(-90), 'sí', 'sí'],
        ['DOC-003', 'Guía de redes sociales', 'Buenas prácticas y tono para las cuentas territoriales.', 'Comunicación', 'Euskadi', 'https://example.org/docs/guia-redes.pdf', D(-30), 'no', 'sí'],
        ['DOC-004', 'Estatutos y reglamento interno', 'Documento organizativo de referencia.', 'Organización', 'Euskadi', 'https://example.org/docs/estatutos.pdf', D(-300), 'no', 'sí'],
        ['DOC-005', 'Calendario del trimestre · Álava', 'Fechas previstas de actividades en Álava.', 'Organización', 'Álava', 'https://example.org/docs/calendario-alava.pdf', D(-2), 'sí', 'sí'],
        ['DOC-006', 'Plantillas de cartelería', 'Archivos editables para carteles de actos.', 'Material gráfico', 'Euskadi', 'https://example.org/docs/plantillas-carteles.zip', D(-15), 'no', 'sí'],
        ['DOC-007', 'Presentación campaña campus', 'Diapositivas para las mesas informativas universitarias.', 'Campañas', 'Bizkaia', 'https://example.org/docs/campus-bizkaia.pdf', D(-6), 'no', 'sí'],
        ['DOC-008', 'Curso de oratoria · materiales', 'Apuntes y ejercicios de la formación de hablar en público.', 'Formación', 'Álava', 'https://example.org/docs/oratoria.pdf', D(-20), 'no', 'sí'],
        ['DOC-009', 'Protocolo de actos', 'Cómo organizar un acto: checklist de antes, durante y después.', 'Organización', 'Gipuzkoa', 'https://example.org/docs/protocolo-actos.pdf', D(-45), 'no', 'sí'],
        ['DOC-010', 'Argumentario de empleo joven', 'Datos de paro juvenil y propuestas.', 'Argumentarios', 'Euskadi', 'https://example.org/docs/argumentario-empleo.pdf', D(-60), 'no', 'sí'],
        ['DOC-011', 'Notas de prensa · plantilla', 'Estructura y ejemplo de nota de prensa.', 'Comunicación', 'Gipuzkoa', 'https://example.org/docs/nota-prensa.docx', D(-75), 'no', 'sí'],
        ['DOC-012', 'Guía de debate', 'Material de preparación para debates internos y torneos.', 'Formación', 'Euskadi', 'https://example.org/docs/guia-debate.pdf', D(-10), 'no', 'sí'],
      ],
    ),
    CONFIGURACION: table(
      ['clave', 'valor'],
      [
        ['inicio_titulo', 'Lo que estamos haciendo juntos.'],
        ['inicio_subtitulo', 'Qué viene, qué estamos preparando y dónde puedes echar una mano.'],
        ['campana_principal', 'PRY-29N'],
        ['categorias_documentos', 'Organización, Argumentarios, Comunicación, Campañas, Formación, Material gráfico'],
      ],
    ),
    TERRITORIOS: table(
      ['id', 'nombre', 'activo'],
      [
        ['euskadi', 'Euskadi', 'sí'],
        ['alava', 'Álava', 'sí'],
        ['bizkaia', 'Bizkaia', 'sí'],
        ['gipuzkoa', 'Gipuzkoa', 'sí'],
      ],
    ),
  }
}
