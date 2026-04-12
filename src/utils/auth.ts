import { TOKEN_STORAGE_KEY } from '@/constants/app'

export const getToken = () => localStorage.getItem(TOKEN_STORAGE_KEY) || ''

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}
