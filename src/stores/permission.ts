import type { RouteRecordRaw } from 'vue-router'
import { defineStore } from 'pinia'
import { dashboardRoute, asyncRoutes } from '@/router/routes'
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@/constants/permission'
import type { AdminUser } from '@/types/auth'

interface PermissionState {
  roles: string[]
  permissions: string[]
  routes: RouteRecordRaw[]
  menus: RouteRecordRaw[]
  isInitialized: boolean
}

const normalizeMetaStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

const hasFullAccessRole = (roles: string[]) =>
  roles.includes(SUPER_ADMIN_ROLE) || roles.includes(ADMIN_ROLE)

const cloneRoute = (route: RouteRecordRaw): RouteRecordRaw => {
  const cloned: RouteRecordRaw = { ...route }

  if (route.children) {
    cloned.children = route.children.map(cloneRoute)
  }

  return cloned
}

const hasAccess = (route: RouteRecordRaw, roles: string[], permissions: string[]) => {
  if (hasFullAccessRole(roles)) {
    return true
  }

  const routeRoles = normalizeMetaStringArray(route.meta?.roles)
  const routePermissions = normalizeMetaStringArray(route.meta?.permissions)
  const matchRole = routeRoles.length === 0 || routeRoles.some((item) => roles.includes(item))
  const matchPermission =
    routePermissions.length === 0 ||
    routePermissions.some((item) => permissions.includes(item))

  return matchRole && matchPermission
}

const filterRoutes = (
  routes: RouteRecordRaw[],
  roles: string[],
  permissions: string[]
): RouteRecordRaw[] =>
  routes.reduce<RouteRecordRaw[]>((result, route) => {
    const current = cloneRoute(route)

    if (!hasAccess(current, roles, permissions)) {
      return result
    }

    if (current.children?.length) {
      current.children = filterRoutes(current.children, roles, permissions)
    }

    result.push(current)
    return result
  }, [])

const filterMenus = (routes: RouteRecordRaw[]): RouteRecordRaw[] =>
  routes.filter((route) => !route.meta?.hidden).map((route): RouteRecordRaw => {
    const current = cloneRoute(route)

    current.children = current.children ? filterMenus(current.children) : undefined

    return current
  })

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    roles: [],
    permissions: [],
    routes: [],
    menus: [],
    isInitialized: false
  }),
  actions: {
    reset() {
      this.roles = []
      this.permissions = []
      this.routes = []
      this.menus = []
      this.isInitialized = false
    },
    generateRoutes(user: AdminUser) {
      const roles = normalizeMetaStringArray(user.roles)
      const permissions = normalizeMetaStringArray(user.permissions)

      this.roles = roles
      this.permissions = permissions
      this.routes = filterRoutes(asyncRoutes, roles, permissions)
      this.menus = filterMenus([cloneRoute(dashboardRoute), ...this.routes])
      this.isInitialized = true
      return this.routes
    },
    hasAnyPermission(values: string | string[]) {
      const targets = Array.isArray(values) ? values : [values]

      if (hasFullAccessRole(this.roles)) {
        return true
      }

      return targets.some((item) => this.permissions.includes(item))
    },
    hasAnyRole(values: string | string[]) {
      const targets = Array.isArray(values) ? values : [values]

      if (hasFullAccessRole(this.roles)) {
        return true
      }

      return targets.some((item) => this.roles.includes(item))
    }
  }
})
