/**
 * Contrato entre la aplicación y el Google Sheet.
 * Nombre de cada hoja y columnas esperadas (la fila 1 de cada hoja son las cabeceras).
 * El orden de las columnas en el Sheet es libre; se localizan por nombre.
 */
export const SHEETS = {
  ACTIVIDADES: [
    'id', 'titulo', 'descripcion', 'territorio', 'fecha', 'hora', 'lugar', 'plazas',
    'inscripcion_inicio', 'inscripcion_fin', 'estado', 'visible', 'destacado',
  ],
  PROYECTOS: [
    'id', 'titulo', 'descripcion', 'tipo', 'territorio', 'estado', 'fecha_inicio', 'fecha_prevista', 'visible', 'destacado',
  ],
  OPORTUNIDADES: ['id', 'proyecto_id', 'nombre', 'descripcion', 'fecha_limite', 'estado', 'visible'],
  DOCUMENTOS: ['id', 'titulo', 'descripcion', 'categoria', 'territorio', 'url', 'fecha', 'destacado', 'visible'],
  CONFIGURACION: ['clave', 'valor'],
  TERRITORIOS: ['id', 'nombre', 'activo'],
} as const

export type SheetName = keyof typeof SHEETS
export const SHEET_NAMES = Object.keys(SHEETS) as SheetName[]

/** Tabla cruda tal y como la devuelve la API de Google Sheets: filas de celdas de texto. */
export type RawTable = string[][]
export type RawWorkbook = Partial<Record<SheetName, RawTable>>

/** Claves reconocidas en la hoja CONFIGURACION. */
export const CONFIG_KEYS = {
  heroTitle: 'inicio_titulo',
  heroSubtitle: 'inicio_subtitulo',
  documentCategories: 'categorias_documentos',
  featuredProject: 'campana_principal',
} as const
