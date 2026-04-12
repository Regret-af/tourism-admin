import { defineStore } from 'pinia'
import { getProfileApi, loginApi, logoutApi } from '@/api/auth'
import type { AdminUser, LoginPayload } from '@/types/auth'
import { clearToken, getToken, setToken } from '@/utils/auth'

interface AuthState {
  token: string
  user: AdminUser | null
}

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
      this.setAuth(result.accessToken, result.user)
      return result.user
    },
    async fetchProfile() {
      if (!this.token) {
        return null
      }

      const user = await getProfileApi()
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
