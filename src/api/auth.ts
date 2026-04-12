import type { AdminUser, LoginPayload, LoginResult } from '@/types/auth'
import request from '@/utils/request'

export const loginApi = (payload: LoginPayload) => {
  return request.post<LoginResult, LoginPayload>('/admin/auth/login', payload, {
    skipAuth: true
  })
}

export const getProfileApi = () => request.get<AdminUser>('/admin/auth/me')

export const logoutApi = () => request.post<boolean>('/admin/auth/logout')
