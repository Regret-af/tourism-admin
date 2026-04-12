export interface AdminUser {
  id: string
  email: string
  username?: string
  nickname: string
  avatarUrl?: string
  roles: string[]
  permissions?: string[]
  status?: number
  bio?: string | null
  createdAt?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AdminUser
}
