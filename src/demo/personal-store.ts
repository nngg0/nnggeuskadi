import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { PersonalStore } from '@/lib/personal/store'
import type { UserSettings } from '@/lib/domain/types'
import { sanitizeInterests, type InterestId } from '@/lib/domain/interests'
import { parseTerritory } from '@/lib/domain/territories'
import { parseWorkbook } from '@/lib/sheets/parse'
import { demoWorkbook } from './content'
import { findDemoUser } from './users'
import { DEMO_SESSION_COOKIE } from './session'
import {
  DEMO_ACCESS_REQUESTS,
  DEMO_EXTRA_MEMBERS,
  DEMO_INITIAL_STATE,
  DEMO_OTHER_PARTICIPATIONS,
  DEMO_OTHER_REGISTRATIONS,
  demoPeople,
} from './personal-seed'
import { DEMO_USERS } from './users'
import { can, managedTerritories } from '@/lib/auth/permissions'
import { USER_ROLES, type Member, type UserRole } from '@/lib/domain/types'

/*
 * DATOS DEMO — almacén personal sin base de datos.
 * El estado del usuario demo se guarda en una cookie, así la demo funciona igual en local
 * y en un despliegue serverless. Los agregados de "otros afiliados" salen de personal-seed.ts.
 */

const COOKIE = 'nngg_demo_state'

const stateSchema = z.object({
  u: z.string(),
  r: z.array(z.string().max(64)).max(100),
  rt: z.record(z.string(), z.string()).default({}),
  p: z.record(z.string().max(64), z.array(z.string().max(64)).max(20)),
  pt: z.record(z.string(), z.string()).default({}),
  s: z.array(z.string().max(64)).max(200),
  n: z.string().max(80).optional(),
  st: z.object({ notifyNewInitiatives: z.boolean() }).optional(),
  i: z.array(z.string().max(20)).max(3).optional(),
  // Solicitudes de acceso revisadas en la demo: id -> rol aprobado o 'rechazada'
  ar: z.record(z.string().max(64), z.string().max(30)).default({}),
  // Territorio elegido al aprobar: id -> territorio
  at: z.record(z.string().max(64), z.string().max(30)).default({}),
})
type DemoState = z.infer<typeof stateSchema>

function initialState(userId: string): DemoState {
  const seed = DEMO_INITIAL_STATE.default!
  const stamp = new Date(Date.now() - 3 * 864e5).toISOString()
  return {
    u: userId,
    r: [...seed.registrations],
    rt: Object.fromEntries(seed.registrations.map((id) => [id, stamp])),
    p: structuredClone(seed.participations),
    pt: Object.fromEntries(Object.keys(seed.participations).map((id) => [id, stamp])),
    s: [...seed.saved],
    ar: {},
    at: {},
  }
}

async function readState(userId: string): Promise<DemoState> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (raw) {
    try {
      const parsed = stateSchema.safeParse(JSON.parse(raw))
      if (parsed.success && parsed.data.u === userId) return parsed.data
    } catch {
      // cookie corrupta: se reinicia
    }
  }
  return initialState(userId)
}

async function writeState(state: DemoState): Promise<void> {
  ;(await cookies()).set(COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

async function currentDemoUserId(): Promise<string | null> {
  return (await cookies()).get(DEMO_SESSION_COOKIE)?.value ?? null
}

function demoOpportunityProjects(): Map<string, string> {
  return new Map(parseWorkbook(demoWorkbook()).opportunities.map((o) => [o.id, o.projectId]))
}

async function mutate(userId: string, fn: (s: DemoState) => void) {
  const state = await readState(userId)
  fn(state)
  await writeState(state)
}

async function currentDemoUser() {
  return findDemoUser((await currentDemoUserId()) ?? undefined)
}

export const demoPersonalStore: PersonalStore = {
  async registrationCounts(eventIds) {
    const userId = await currentDemoUserId()
    const mine = userId ? new Set((await readState(userId)).r) : new Set<string>()
    return new Map(eventIds.map((id) => [id, (DEMO_OTHER_REGISTRATIONS[id] ?? 0) + (mine.has(id) ? 1 : 0)]))
  },

  async participationCounts(projectIds) {
    const userId = await currentDemoUserId()
    const state = userId ? await readState(userId) : null
    const oppProject = demoOpportunityProjects()
    const byOpportunity = new Map<string, number>()
    const byProject = new Map<string, number>()
    for (const [oppId, projectId] of oppProject) {
      if (!projectIds.includes(projectId)) continue
      const own = state?.p[projectId]?.includes(oppId) ? 1 : 0
      const count = (DEMO_OTHER_PARTICIPATIONS[oppId] ?? 0) + own
      byOpportunity.set(oppId, count)
      byProject.set(projectId, Math.max(byProject.get(projectId) ?? 0, count))
    }
    return { byOpportunity, byProject }
  },

  async myRegistrations(userId) {
    const s = await readState(userId)
    return s.r.map((eventId) => ({ eventId, createdAt: s.rt[eventId] ?? new Date().toISOString(), answers: {} }))
  },

  async register(userId, input) {
    const s = await readState(userId)
    if (s.r.includes(input.eventId)) return 'already'
    const others = DEMO_OTHER_REGISTRATIONS[input.eventId] ?? 0
    if (input.capacity !== null && others >= input.capacity) return 'full'
    s.r.push(input.eventId)
    s.rt[input.eventId] = new Date().toISOString()
    await writeState(s)
    return 'ok'
  },

  async cancelRegistration(userId, eventId) {
    await mutate(userId, (s) => {
      s.r = s.r.filter((id) => id !== eventId)
      delete s.rt[eventId]
    })
  },

  async myParticipations(userId) {
    const s = await readState(userId)
    return Object.entries(s.p).map(([projectId, opportunityIds]) => ({
      projectId,
      opportunityIds,
      createdAt: s.pt[projectId] ?? new Date().toISOString(),
    }))
  },

  async saveParticipation(userId, input) {
    await mutate(userId, (s) => {
      s.p[input.projectId] = input.opportunityIds
      s.pt[input.projectId] = s.pt[input.projectId] ?? new Date().toISOString()
    })
  },

  async withdrawParticipation(userId, projectId) {
    await mutate(userId, (s) => {
      delete s.p[projectId]
      delete s.pt[projectId]
    })
  },

  async savedDocumentIds(userId) {
    return (await readState(userId)).s
  },

  async setDocumentSaved(userId, documentId, saved) {
    await mutate(userId, (s) => {
      s.s = s.s.filter((id) => id !== documentId)
      if (saved) s.s.unshift(documentId)
    })
  },

  async updateProfile(userId, input: { displayName: string; settings: UserSettings }) {
    await mutate(userId, (s) => {
      s.n = input.displayName
      s.st = input.settings
    })
  },

  async updateInterests(userId, interests) {
    await mutate(userId, (s) => {
      s.i = interests
    })
  },

  async eventRegistrants(eventId) {
    const content = parseWorkbook(demoWorkbook())
    const activity = content.activities.find((a) => a.id === eventId)
    if (!activity) return []
    const people = demoPeople(DEMO_OTHER_REGISTRATIONS[eventId] ?? 0, activity.territory)
    const userId = await currentDemoUserId()
    const user = findDemoUser(userId ?? undefined)
    if (user && (await readState(user.id)).r.includes(eventId)) {
      people.unshift({ displayName: user.displayName, territory: user.territory, createdAt: new Date().toISOString() })
    }
    return people
  },

  async projectParticipants(projectId) {
    const content = parseWorkbook(demoWorkbook())
    const project = content.projects.find((p) => p.id === projectId)
    if (!project) return []
    const opps = content.opportunities.filter((o) => o.projectId === projectId)
    const total = opps.reduce((n, o) => n + (DEMO_OTHER_PARTICIPATIONS[o.id] ?? 0), 0)
    const people = demoPeople(total, project.territory, opps.map((o) => o.id))
    const userId = await currentDemoUserId()
    const user = findDemoUser(userId ?? undefined)
    const mine = user ? (await readState(user.id)).p[projectId] : undefined
    if (user && mine) {
      people.unshift({ displayName: user.displayName, territory: user.territory, createdAt: new Date().toISOString(), opportunityIds: mine })
    }
    return people
  },

  async listAccessRequests() {
    const user = await currentDemoUser()
    if (!user || !can(user, 'members.approve')) return []
    const reviewed = (await readState(user.id)).ar
    return DEMO_ACCESS_REQUESTS.filter((r) => !reviewed[r.id])
  },

  async approveAccessRequest(id, role, territory) {
    const user = await currentDemoUser()
    if (!user || !can(user, 'members.approve')) throw new Error('Sin permiso')
    if (!DEMO_ACCESS_REQUESTS.some((r) => r.id === id)) throw new Error('Solicitud no encontrada')
    await mutate(user.id, (s) => {
      s.ar[id] = role
      s.at[id] = territory
    })
  },

  async rejectAccessRequest(id) {
    const user = await currentDemoUser()
    if (!user || !can(user, 'members.approve')) throw new Error('Sin permiso')
    await mutate(user.id, (s) => {
      s.ar[id] = 'rechazada'
    })
  },

  async listMembers() {
    const user = await currentDemoUser()
    if (!user) return []
    const scope = managedTerritories(user)
    const { ar: reviewed, at: territories } = await readState(user.id)
    const approved: Member[] = DEMO_ACCESS_REQUESTS.filter((r) => (USER_ROLES as readonly string[]).includes(reviewed[r.id] ?? '')).map(
      (r) => ({
        displayName: r.displayName,
        email: r.email,
        territory: parseTerritory(territories[r.id]) ?? r.territory ?? 'euskadi',
        role: reviewed[r.id] as UserRole,
        interests: [],
        createdAt: r.createdAt,
      }),
    )
    const users: Member[] = DEMO_USERS.map((u) => ({
      displayName: u.displayName,
      email: u.email,
      territory: u.territory,
      role: u.role,
      interests: u.interests,
      createdAt: '2026-09-01T10:00:00.000Z',
    }))
    return [...users, ...DEMO_EXTRA_MEMBERS, ...approved]
      .filter((m) => scope.includes(m.territory))
      .sort((a, b) => a.territory.localeCompare(b.territory) || a.displayName.localeCompare(b.displayName, 'es'))
  },
}

/** Nombre y ajustes editados por el usuario demo (se superponen al usuario ficticio). */
export async function demoProfileOverrides(
  userId: string,
): Promise<{ displayName?: string; settings?: UserSettings; interests?: InterestId[] }> {
  const s = await readState(userId)
  return { displayName: s.n, settings: s.st, interests: s.i ? sanitizeInterests(s.i) : undefined }
}
