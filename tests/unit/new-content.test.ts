import { describe, expect, it } from 'vitest'
import {
  editedOpportunitiesFromForm,
  editProjectSchema,
  planOpportunityChanges,
  projectEditRecord,
  activityEditRecord,
  activityRecord,
  editActivitySchema,
  newActivitySchema,
  newProjectSchema,
  nextId,
  opportunitiesFromForm,
  projectRecords,
} from '@/lib/domain/new-content'
import { SHEETS } from '@/lib/sheets/columns'
import { parseActivities, parseOpportunities, parseProjects } from '@/lib/sheets/parse'
import { changedCells, idsOf, mergeRow, recordToRow, rowNumberOf } from '@/lib/sheets/rows'
import { columnLetter } from '@/lib/sheets/client'

const TODAY = '2026-10-16'

const activityForm = {
  titulo: 'Charla sobre vivienda',
  descripcion: 'Con un invitado.\nAbierta a todos.',
  territorio: 'bizkaia',
  fecha: '2026-11-03',
  hora: '19:00',
  lugar: 'Bilbao · Sede',
  plazas: '40',
  inscripcion_fin: '2026-11-01',
  estado: 'confirmada',
}

describe('ids nuevos', () => {
  it('sigue la numeración del Sheet', () => {
    expect(nextId('ACT-', ['ACT-031', 'ACT-099', 'ACT-030'])).toBe('ACT-100')
    expect(nextId('PRY-', ['PRY-29N', 'PRY-DEBATE', 'PRY-006'])).toBe('PRY-007')
    expect(nextId('OP-', ['OP-29N-1', 'OP-DEB-1'])).toBe('OP-001')
    expect(nextId('ACT-', [])).toBe('ACT-001')
  })

  it('no repite un id aunque cambie el formato o las mayúsculas', () => {
    expect(nextId('ACT-', ['act-5', 'ACT-006'])).toBe('ACT-007')
  })

  it('lee la columna id de una tabla cruda', () => {
    expect(idsOf([['titulo', 'ID'], ['A', 'ACT-1'], ['B', ''], ['C', 'ACT-2']])).toEqual(['ACT-1', 'ACT-2'])
    expect(idsOf(undefined)).toEqual([])
  })
})

describe('validación del formulario de actividad', () => {
  it('acepta una actividad correcta', () => {
    const r = newActivitySchema(TODAY).safeParse(activityForm)
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({ territorio: 'bizkaia', plazas: 40, hora: '19:00', estado: 'confirmada' })
  })

  it('campos opcionales vacíos', () => {
    const r = newActivitySchema(TODAY).safeParse({ ...activityForm, hora: '', plazas: '', inscripcion_fin: '', estado: undefined })
    expect(r.success && r.data).toMatchObject({ hora: null, plazas: null, inscripcion_fin: null, estado: 'confirmada' })
  })

  it('rechaza fechas pasadas, cierres posteriores, territorios y plazas inválidos', () => {
    const s = newActivitySchema(TODAY)
    expect(s.safeParse({ ...activityForm, fecha: '2026-10-15' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, inscripcion_fin: '2026-11-04' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, territorio: 'madrid' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, plazas: '0' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, plazas: '3.5' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, estado: 'cancelada' }).success).toBe(false)
    expect(s.safeParse({ ...activityForm, titulo: '  ' }).success).toBe(false)
  })
})

describe('filas nuevas del Sheet', () => {
  it('la actividad creada se lee igual que una fila escrita a mano', () => {
    const input = newActivitySchema(TODAY).parse(activityForm)
    const header = [...SHEETS.ACTIVIDADES].reverse() // el orden de columnas del Sheet es libre
    const row = recordToRow(header, activityRecord('ACT-100', input))
    const { items, issues } = parseActivities([header, row])
    expect(issues).toEqual([])
    expect(items[0]).toMatchObject({
      id: 'ACT-100',
      title: 'Charla sobre vivienda',
      territory: 'bizkaia',
      date: '2026-11-03',
      time: '19:00',
      capacity: 40,
      status: 'confirmada',
      visible: true,
    })
  })

  it('un texto que parece fórmula se escribe como texto', () => {
    const input = newActivitySchema(TODAY).parse({ ...activityForm, titulo: '=IMPORTXML("x")' })
    expect(activityRecord('ACT-1', input).titulo).toBe('=IMPORTXML("x")')
  })

  it('rechaza escribir si falta una columna con valor', () => {
    const input = newActivitySchema(TODAY).parse(activityForm)
    expect(() => recordToRow(['id', 'titulo'], activityRecord('ACT-1', input))).toThrow(/Faltan columnas/)
  })

  it('proyecto y ámbitos quedan enlazados y válidos', () => {
    const input = newProjectSchema(TODAY).parse({
      titulo: 'Ruta por los pueblos',
      descripcion: '',
      tipo: 'Evento',
      territorio: 'gipuzkoa',
      estado: undefined,
      fecha_prevista: '',
      ambitos: opportunitiesFromForm(['Logística', '', 'Redes'], ['Furgonetas', '', '']),
    })
    expect(input.ambitos).toHaveLength(2)
    const rows = projectRecords({ project: 'PRY-007', opportunities: ['OP-001', 'OP-002'] }, input, TODAY)
    const projects = parseProjects([[...SHEETS.PROYECTOS], recordToRow([...SHEETS.PROYECTOS], rows.project)])
    const opps = parseOpportunities([[...SHEETS.OPORTUNIDADES], ...rows.opportunities.map((r) => recordToRow([...SHEETS.OPORTUNIDADES], r))])
    expect(projects.issues).toEqual([])
    expect(projects.items[0]).toMatchObject({ id: 'PRY-007', territory: 'gipuzkoa', status: 'en_preparacion', startDate: TODAY })
    expect(opps.issues).toEqual([])
    expect(opps.items.map((o) => [o.id, o.projectId, o.name, o.status])).toEqual([
      ['OP-001', 'PRY-007', 'Logística', 'abierta'],
      ['OP-002', 'PRY-007', 'Redes', 'abierta'],
    ])
  })

  it('un proyecto necesita al menos un ámbito', () => {
    const r = newProjectSchema(TODAY).safeParse({
      titulo: 'Sin ámbitos', descripcion: '', tipo: '', territorio: 'euskadi', fecha_prevista: '', ambitos: [],
    })
    expect(r.success).toBe(false)
  })
})

describe('edición de actos', () => {
  const form = { ...activityForm, estado: 'cancelada' }

  it('admite cerrar o cancelar y conservar una fecha ya pasada, pero no moverla a otra fecha pasada', () => {
    expect(editActivitySchema(TODAY, '2026-10-10').safeParse({ ...form, fecha: '2026-10-10', inscripcion_fin: '' }).success).toBe(true)
    expect(editActivitySchema(TODAY, '2026-10-10').safeParse({ ...form, fecha: '2026-10-01', inscripcion_fin: '' }).success).toBe(false)
    expect(editActivitySchema(TODAY, '2026-11-03').safeParse({ ...form, fecha: '2026-10-10', inscripcion_fin: '' }).success).toBe(false)
    expect(newActivitySchema(TODAY).safeParse(form).success).toBe(false) // al crear no se puede cancelar
  })

  it('solo cambia las columnas del formulario y conserva el cierre original si no se toca', () => {
    const input = editActivitySchema(TODAY, '2026-11-03').parse(activityForm)
    const record = activityEditRecord(input, { closesOnDate: '2026-11-01' })
    expect(record).not.toHaveProperty('id')
    expect(record).not.toHaveProperty('inscripcion_inicio')
    expect(record).not.toHaveProperty('visible')
    expect(record).not.toHaveProperty('destacado')
    expect(record).not.toHaveProperty('inscripcion_fin')
    expect(activityEditRecord(input, { closesOnDate: '2026-10-30' })).toHaveProperty('inscripcion_fin', '01/11/2026')
  })

  it('localiza la fila por id y escribe solo las celdas que cambian', () => {
    const header = ['ID', 'titulo', 'visible', 'fecha']
    const table = [header, ['ACT-1', 'Uno', 'sí', '01/11/2026'], ['ACT-2', 'Dos', 'no', '02/11/2026']]
    expect(rowNumberOf(table, 'ACT-2')).toBe(3)
    expect(rowNumberOf(table, 'ACT-9')).toBeNull()
    expect([...changedCells(header, { titulo: 'Nuevo', fecha: '05/11/2026' })]).toEqual([[1, 'Nuevo'], [3, '05/11/2026']])
    expect(mergeRow(header, table[2]!, { titulo: 'Nuevo' })).toEqual(['ACT-2', 'Nuevo', 'no', '02/11/2026'])
    expect(() => changedCells(header, { lugar: 'Bilbao' })).toThrow(/Faltan columnas/)
  })

  it('letras de columna A1', () => {
    expect([0, 12, 25, 26, 27].map(columnLetter)).toEqual(['A', 'M', 'Z', 'AA', 'AB'])
  })
})

describe('edición de proyectos y ámbitos', () => {
  const base = { titulo: 'Debate', descripcion: '', tipo: '', territorio: 'euskadi', estado: 'cerrado', fecha_prevista: '' }

  it('lee los ámbitos del formulario: existentes con id, nuevos sin id, y descarta filas nuevas vacías', () => {
    expect(
      editedOpportunitiesFromForm(['OP-1', '', '', 'OP-2'], ['Organización', 'Logística', '', ''], ['', '', '', ''], ['cerrada', 'abierta', 'abierta', '']),
    ).toEqual([
      { id: 'OP-1', nombre: 'Organización', descripcion: '', estado: 'cerrada' },
      { id: '', nombre: 'Logística', descripcion: '', estado: 'abierta' },
      { id: 'OP-2', nombre: '', descripcion: '', estado: undefined },
    ])
  })

  it('valida: se puede cerrar el proyecto, hace falta al menos un ámbito y cada uno con nombre', () => {
    const ok = editProjectSchema(TODAY, null).safeParse({ ...base, ambitos: [{ id: 'OP-1', nombre: 'Organización', descripcion: '' }] })
    expect(ok.success && ok.data.estado).toBe('cerrado')
    expect(ok.success && ok.data.ambitos[0]!.estado).toBe('abierta')
    expect(editProjectSchema(TODAY, null).safeParse({ ...base, ambitos: [] }).success).toBe(false)
    expect(editProjectSchema(TODAY, null).safeParse({ ...base, ambitos: [{ id: 'OP-2', nombre: '', descripcion: '' }] }).success).toBe(false)
    expect(editProjectSchema(TODAY, null).safeParse({ ...base, ambitos: [{ id: 'x y', nombre: 'Ok', descripcion: '' }] }).success).toBe(false)
  })

  it('conserva una fecha prevista ya pasada pero no permite otra pasada', () => {
    const amb = [{ id: '', nombre: 'Uno', descripcion: '' }]
    expect(editProjectSchema(TODAY, '2026-10-01').safeParse({ ...base, fecha_prevista: '2026-10-01', ambitos: amb }).success).toBe(true)
    expect(editProjectSchema(TODAY, '2026-10-01').safeParse({ ...base, fecha_prevista: '2026-09-01', ambitos: amb }).success).toBe(false)
  })

  it('planifica: actualiza los que siguen, oculta los quitados y crea los nuevos con ids libres', () => {
    const input = editProjectSchema(TODAY, null).parse({
      ...base,
      ambitos: [
        { id: 'OP-DEB-1', nombre: 'Organización y sede', descripcion: 'Todo', estado: 'cerrada' },
        { id: '', nombre: 'Logística', descripcion: '' },
      ],
    })
    const plan = planOpportunityChanges('PRY-DEBATE', [{ id: 'OP-DEB-1' }, { id: 'OP-DEB-2' }], input.ambitos, ['OP-001', 'OP-002'])
    expect(plan.unknownIds).toEqual([])
    expect(plan.updates).toEqual([
      { id: 'OP-DEB-1', record: { nombre: 'Organización y sede', descripcion: 'Todo', estado: 'cerrada' } },
      { id: 'OP-DEB-2', record: { visible: 'no' } },
    ])
    expect(plan.creates).toEqual([
      { id: 'OP-003', proyecto_id: 'PRY-DEBATE', nombre: 'Logística', descripcion: '', fecha_limite: '', estado: 'abierta', visible: 'sí' },
    ])
    expect(projectEditRecord(input)).toMatchObject({ titulo: 'Debate', territorio: 'Euskadi', estado: 'cerrado', fecha_prevista: '' })
  })

  it('detecta ids de ámbitos que no son del proyecto', () => {
    const input = editProjectSchema(TODAY, null).parse({ ...base, ambitos: [{ id: 'OP-29N-1', nombre: 'Ajeno', descripcion: '' }] })
    expect(planOpportunityChanges('PRY-DEBATE', [{ id: 'OP-DEB-1' }], input.ambitos, []).unknownIds).toEqual(['OP-29N-1'])
  })
})
