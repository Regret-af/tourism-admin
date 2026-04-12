import { IS_MOCK_ENABLED } from '@/constants/app'
import { mockGetProfileApi, mockLoginApi, mockLogoutApi } from '@/mock/auth'
import type { AdminUser, LoginPayload, LoginResult } from '@/types/auth'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'

export const loginApi = (payload: LoginPayload) => {
  if (IS_MOCK_ENABLED) {
    return mockLoginApi(payload)
  }

  return request.post<LoginResult, LoginPayload>('/admin/auth/login', payload, {
    skipAuth: true
  })
}

export const getProfileApi = () => {
  if (IS_MOCK_ENABLED) {
    return mockGetProfileApi(getToken())
  }

  return request.get<AdminUser>('/admin/auth/me')
}

export const logoutApi = () => {
  if (IS_MOCK_ENABLED) {
    return mockLogoutApi()
  }

  return request.post<boolean>('/admin/auth/logout')
}
