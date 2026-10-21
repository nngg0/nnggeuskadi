import type { TerritoryId } from '@/lib/domain/territories'
import type { Activity, CurrentUser, UserRole } from '@/lib/domain/types'

/*
 * Permisos de la aplicación.
 * Se comprueban en servidor (acciones y páginas) y se refuerzan en base de datos
 * (RLS y public.can_manage_territory). Ocultar un botón nunca es el mecanismo de seguridad.
 *
 * Para añadir un rol: añadirlo a USER_ROLES, a la tabla public.roles y definir aquí sus permisos.
 */

export type Permission =
  | 'content.read'
  | 'activity.register'
  | 'project.participate'
  | 'document.save'
  | 'profile.edit'
  | 'manage.viewPeople'
  /** Aprobar o rechazar solicitudes de acceso y asignar roles (solo Administración). */
  | 'members.approve'
  /** Crear actividades y proyectos (filas nuevas del Sheet) en los territorios que gestiona. */
  | 'content.create'
  /** Marcar quién es miembro de la Junta Directiva (Administración y dirección regional). */
  | 'members.setJunta'

const MEMBER: Permission[] = ['content.read', 'activity.register', 'project.participate', 'document.save', 'profile.edit']

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  afiliado: MEMBER,
  direccion_provincial: [...MEMBER, 'manage.viewPeople', 'content.create'],
  direccion_euskadi: [...MEMBER, 'manage.viewPeople', 'content.create', 'members.setJunta'],
  // Administración de la intranet: los permisos de la dirección regional y, además, las altas y los roles.
  administracion: [...MEMBER, 'manage.viewPeople', 'content.create', 'members.setJunta', 'members.approve'],
}

/** Territorios cuyos contenidos gestiona cada rol. */
export function managedTerritories(user: Pick<CurrentUser, 'role' | 'territory'>): TerritoryId[] {
  switch (user.role) {
    case 'direccion_euskadi':
    case 'administracion':
      return ['euskadi', 'alava', 'bizkaia', 'gipuzkoa']
    case 'direccion_provincial':
      return user.territory === 'euskadi' ? [] : [user.territory]
    default:
      return []
  }
}

export function can(
  user: Pick<CurrentUser, 'role' | 'territory'> | null,
  permission: Permission,
  resource?: { territory: TerritoryId },
): boolean {
  if (!user) return false
  if (!ROLE_PERMISSIONS[user.role]?.includes(permission)) return false
  if (permission === 'manage.viewPeople' || permission === 'content.create') {
    if (!resource) return false
    return managedTerritories(user).includes(resource.territory)
  }
  return true
}

/**
 * ¿Puede ver este acto? Las juntas cerradas solo las ven los miembros de la Junta Directiva
 * y quien puede editarlas (para gestionarlas). Se aplica en servidor a todo el contenido de la petición.
 */
export function canSeeActivity(
  user: Pick<CurrentUser, 'role' | 'territory' | 'junta'> | null,
  activity: Pick<Activity, 'kind' | 'access' | 'territory'>,
): boolean {
  if (activity.kind !== 'junta' || activity.access !== 'cerrado') return true
  if (!user) return false
  return user.junta || can(user, 'content.create', { territory: activity.territory })
}

/** Territorios en los que puede crear actividades y proyectos (vacío = no ve el botón «+»). */
export function creatableTerritories(user: Pick<CurrentUser, 'role' | 'territory'> | null): TerritoryId[] {
  if (!user || !ROLE_PERMISSIONS[user.role]?.includes('content.create')) return []
  return managedTerritories(user)
}

/** ¿Ve el listado de miembros de algún territorio? (dirección provincial, regional y Administración) */
export function canListMembers(user: Pick<CurrentUser, 'role' | 'territory'> | null): boolean {
  return user !== null && managedTerritories(user).length > 0
}

export const ROLE_LABELS: Record<UserRole, string> = {
  afiliado: 'Afiliado',
  direccion_euskadi: 'Dirección regional',
  administracion: 'Administración',
  direccion_provincial: 'Dirección provincial',
}
