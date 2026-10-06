import type { TerritoryId } from '@/lib/domain/territories'
import type { CurrentUser, UserRole } from '@/lib/domain/types'

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

const MEMBER: Permission[] = ['content.read', 'activity.register', 'project.participate', 'document.save', 'profile.edit']

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  afiliado: MEMBER,
  direccion_provincial: [...MEMBER, 'manage.viewPeople'],
  direccion_euskadi: [...MEMBER, 'manage.viewPeople'],
  // Administración de la intranet: de momento, los mismos permisos que la dirección regional.
  administracion: [...MEMBER, 'manage.viewPeople', 'members.approve'],
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
  if (permission === 'manage.viewPeople') {
    if (!resource) return false
    return managedTerritories(user).includes(resource.territory)
  }
  return true
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
