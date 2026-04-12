import { defineStore } from 'pinia'
import { getProfileApi, loginApi, logoutApi } from '@/api/auth'
import type { AdminUser, LoginPayload } from '@/types/auth'
import { clearToken, getToken, setToken } from '@/utils/auth'

interface AuthState {
  token: string
  user: AdminUser | null
}

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

const normalizeAdminUser = (user: AdminUser): AdminUser => ({
  id: String(user.id ?? ''),
  email: user.email ?? '',
  username: user.username ?? '',
  nickname: user.nickname ?? user.username ?? user.email ?? '',
  avatarUrl: user.avatarUrl ?? '',
  roles: normalizeStringArray(user.roles),
  permissions: normalizeStringArray(user.permissions),
  status: typeof user.status === 'number' ? user.status : 1,
  bio: user.bio ?? null,
  createdAt: user.createdAt ?? ''
})

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    user: null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token)
  },
  actions: {
    setAuth(token: string, user?: AdminUser | null) {
      this.token = token
      this.user = user ?? null
      setToken(token)
    },
    clearAuth() {
      this.token = ''
      this.user = null
      clearToken()
    },
    async login(payload: LoginPayload) {
      const result = await loginApi(payload)
      const user = normalizeAdminUser(result.user)
      this.setAuth(result.accessToken, user)
      return user
    },
    async fetchProfile() {
      if (!this.token) {
        return null
      }

      const user = normalizeAdminUser(await getProfileApi())
      this.user = user
      return user
    },
    async logout() {
      try {
        await logoutApi()
      } finally {
        this.clearAuth()
      }
    }
  }
})
