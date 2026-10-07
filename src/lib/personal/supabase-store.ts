import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isTerritoryId, type TerritoryId } from '@/lib/domain/territories'
import { sanitizeInterests } from '@/lib/domain/interests'
import { USER_ROLES, type ManagedPerson, type UserRole } from '@/lib/domain/types'
import type { PersonalStore, RegisterOutcome } from './store'

/*
 * Almacén personal sobre Supabase.
 * - Lecturas y escrituras propias: cliente con la sesión del usuario (RLS).
 * - Inscripción/cancelación: función atómica con service role (control de aforo).
 */

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`Supabase (${context}): ${error?.message ?? 'error desconocido'}`)
}

function toTerritory(value: unknown): TerritoryId {
  return isTerritoryId(value) ? value : 'euskadi'
}

export const supabasePersonalStore: PersonalStore = {
  async registrationCounts(eventIds) {
    const result = new Map<string, number>(eventIds.map((id) => [id, 0]))
    if (eventIds.length === 0) return result
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('event_registration_counts', { event_ids: eventIds })
    if (error) fail('contadores de inscripción', error)
    for (const row of (data ?? []) as { event_id: string; registered: number }[]) result.set(row.event_id, row.registered)
    return result
  },

  async participationCounts(projectIds) {
    const byOpportunity = new Map<string, number>()
    const byProject = new Map<string, number>()
    if (projectIds.length === 0) return { byOpportunity, byProject }
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('participation_counts', { project_ids: projectIds })
    if (error) fail('contadores de participación', error)
    for (const row of (data ?? []) as { project_id: string; opportunity_id: string | null; participants: number }[]) {
      if (row.opportunity_id === null) byProject.set(row.project_id, row.participants)
      else byOpportunity.set(row.opportunity_id, row.participants)
    }
    return { byOpportunity, byProject }
  },

  async myRegistrations(userId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('event_registrations')
      .select('event_id, created_at, answers')
      .eq('user_id', userId)
    if (error) fail('mis inscripciones', error)
    return (data ?? []).map((r) => ({
      eventId: r.event_id as string,
      createdAt: r.created_at as string,
      answers: (r.answers ?? {}) as Record<string, unknown>,
    }))
  },

  async register(userId, input) {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.rpc('register_for_event', {
      p_user_id: userId,
      p_event_id: input.eventId,
      p_territory: input.territory,
      p_capacity: input.capacity,
      p_answers: input.answers ?? {},
    })
    if (error) fail('inscripción', error)
    if (data === 'ok' || data === 'already' || data === 'full') return data as RegisterOutcome
    throw new Error(`Supabase (inscripción): respuesta inesperada ${String(data)}`)
  },

  async cancelRegistration(userId, eventId) {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.rpc('cancel_event_registration', { p_user_id: userId, p_event_id: eventId })
    if (error) fail('cancelación', error)
  },

  async myParticipations(userId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('project_participations')
      .select('project_id, opportunity_ids, created_at')
      .eq('user_id', userId)
    if (error) fail('mis participaciones', error)
    return (data ?? []).map((p) => ({
      projectId: p.project_id as string,
      opportunityIds: (p.opportunity_ids ?? []) as string[],
      createdAt: p.created_at as string,
    }))
  },

  async saveParticipation(userId, input) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('project_participations').upsert(
      {
        user_id: userId,
        project_id: input.projectId,
        territory: input.territory,
        opportunity_ids: input.opportunityIds,
      },
      { onConflict: 'project_id,user_id' },
    )
    if (error) fail('participación', error)
  },

  async withdrawParticipation(userId, projectId) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('project_participations')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)
    if (error) fail('retirar participación', error)
  },

  async savedDocumentIds(userId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('saved_documents')
      .select('document_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) fail('documentos guardados', error)
    return (data ?? []).map((d) => d.document_id as string)
  },

  async setDocumentSaved(userId, documentId, saved) {
    const supabase = await createSupabaseServerClient()
    const { error } = saved
      ? await supabase
          .from('saved_documents')
          .upsert({ user_id: userId, document_id: documentId }, { onConflict: 'user_id,document_id', ignoreDuplicates: true })
      : await supabase.from('saved_documents').delete().eq('user_id', userId).eq('document_id', documentId)
    if (error) fail('guardar documento', error)
  },

  async updateProfile(userId, input) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: input.displayName, settings: input.settings })
      .eq('id', userId)
    if (error) fail('perfil', error)
  },

  async updateInterests(userId, interests) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('profiles').update({ interests }).eq('id', userId)
    if (error) fail('intereses', error)
  },

  async eventRegistrants(eventId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('list_event_registrants', { p_event_id: eventId })
    if (error) fail('inscritos', error)
    return ((data ?? []) as { display_name: string; territory: string; created_at: string }[]).map(
      (r): ManagedPerson => ({ displayName: r.display_name, territory: toTerritory(r.territory), createdAt: r.created_at }),
    )
  },

  async projectParticipants(projectId) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('list_project_participants', { p_project_id: projectId })
    if (error) fail('participantes', error)
    return (
      (data ?? []) as { display_name: string; territory: string; opportunity_ids: string[]; created_at: string }[]
    ).map(
      (r): ManagedPerson => ({
        displayName: r.display_name,
        territory: toTerritory(r.territory),
        createdAt: r.created_at,
        opportunityIds: r.opportunity_ids,
      }),
    )
  },

  async listAccessRequests() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('list_access_requests')
    if (error) fail('solicitudes de acceso', error)
    return ((data ?? []) as { id: string; email: string; display_name: string; territory: string | null; created_at: string }[]).map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      territory: r.territory ? toTerritory(r.territory) : null,
      createdAt: r.created_at,
    }))
  },

  async approveAccessRequest(id, role, territory) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.rpc('approve_access_request', { p_id: id, p_role: role, p_territory: territory })
    if (error) fail('aprobar solicitud', error)
  },

  async rejectAccessRequest(id) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.rpc('reject_access_request', { p_id: id })
    if (error) fail('rechazar solicitud', error)
  },

  async listMembers() {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('list_members')
    if (error) fail('miembros', error)
    return (
      (data ?? []) as { display_name: string; email: string; territory: string; role: string; interests: string[]; created_at: string }[]
    ).map((m) => ({
      displayName: m.display_name,
      email: m.email,
      territory: toTerritory(m.territory),
      role: ((USER_ROLES as readonly string[]).includes(m.role) ? m.role : 'afiliado') as UserRole,
      interests: sanitizeInterests(m.interests),
      createdAt: m.created_at,
    }))
  },
}
