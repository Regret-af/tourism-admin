import type { Router } from 'vue-router'
import { APP_TITLE, DEFAULT_HOME_PATH, LOGIN_PATH } from '@/constants/app'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'
import { usePermissionStore } from '@/stores/permission'

const WHITE_LIST = [LOGIN_PATH, '/404']

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const permissionStore = usePermissionStore()
    const metaStore = useMetaStore()
    const hasToken = Boolean(authStore.token)

    if (hasToken) {
      if (to.path === LOGIN_PATH) {
        return { path: DEFAULT_HOME_PATH, replace: true }
      }

      try {
        const user = authStore.user ?? (await authStore.fetchProfile())

        if (!user) {
          throw new Error('未获取到当前登录用户')
        }

        if (!permissionStore.isInitialized) {
          const accessRoutes = permissionStore.generateRoutes(user)

          accessRoutes.forEach((route) => {
            if (route.name && router.hasRoute(route.name)) {
              return
            }

            router.addRoute(route)
          })

          await metaStore.ensureLoaded()

          return { ...to, replace: true }
        }

        await metaStore.ensureLoaded()

        if (
          Array.isArray(to.meta.permissions) &&
          to.meta.permissions.length > 0 &&
          !permissionStore.hasAnyPermission(to.meta.permissions)
        ) {
          return { path: DEFAULT_HOME_PATH, replace: true }
        }

        if (
          Array.isArray(to.meta.roles) &&
          to.meta.roles.length > 0 &&
          !permissionStore.hasAnyRole(to.meta.roles)
        ) {
          return { path: DEFAULT_HOME_PATH, replace: true }
        }

        return true
      } catch {
        authStore.clearAuth()
        permissionStore.reset()
        metaStore.reset()

        return {
          path: LOGIN_PATH,
          query: {
            redirect: to.fullPath
          },
          replace: true
        }
      }
    }

    if (WHITE_LIST.includes(to.path) || to.meta.requiresAuth === false) {
      return true
    }

    return {
      path: LOGIN_PATH,
      query: {
        redirect: to.fullPath
      },
      replace: true
    }
  })

  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
  })
}
